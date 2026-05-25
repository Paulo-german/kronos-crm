/**
 * Backfill one-time: popula currentPeriodStart nas subscriptions existentes
 * e reseta créditos de orgs cujo período já avançou sem reset.
 *
 * Run: pnpm tsx prisma/scripts/backfill-credit-period.ts
 * Flags: --dry-run  → só imprime o que faria, sem alterar nada
 */

import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const isDryRun = process.argv.includes('--dry-run')

function getCurrentPeriod() {
  const now = new Date()
  return { periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1 }
}

async function resetCredits(
  orgId: string,
  walletId: string,
  topUpBalance: number,
  monthlyLimit: number,
  periodStart: Date,
) {
  const { periodYear, periodMonth } = getCurrentPeriod()

  await prisma.aiUsage.upsert({
    where: {
      organizationId_periodYear_periodMonth: {
        organizationId: orgId,
        periodYear,
        periodMonth,
      },
    },
    create: { organizationId: orgId, periodYear, periodMonth, totalCreditsSpent: 0, totalMessagesUsed: 0 },
    update: { totalCreditsSpent: 0 },
  })

  await prisma.creditWallet.update({
    where: { id: walletId },
    data: { creditsLastResetAt: periodStart },
  })

  await prisma.walletTransaction.create({
    data: {
      walletId,
      type: 'MONTHLY_RESET',
      amount: monthlyLimit,
      balanceAfterPlan: monthlyLimit,
      balanceAfterTopUp: topUpBalance,
      description: 'Backfill: renovação de créditos — período não resetado',
      metadata: { periodStart: periodStart.toISOString(), source: 'backfill-credit-period' },
    },
  })
}

async function resolveMonthlyLimit(orgId: string): Promise<number> {
  const subscription = await prisma.subscription.findFirst({
    where: { organizationId: orgId, status: { in: ['active', 'trialing'] } },
    select: { planId: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!subscription?.planId) return 0

  const limit = await prisma.planLimit.findFirst({
    where: { planId: subscription.planId, feature: { key: 'ai.monthly_credits' } },
    select: { valueNumber: true },
  })

  return limit?.valueNumber ?? 0
}

async function main() {
  console.log(`\n=== Backfill Credit Period ${isDryRun ? '[DRY RUN]' : ''} ===\n`)

  const subscriptions = await prisma.subscription.findMany({
    where: { status: { in: ['active', 'trialing'] } },
    select: {
      id: true,
      stripeSubscriptionId: true,
      organizationId: true,
      currentPeriodStart: true,
      organization: {
        select: {
          creditWallet: {
            select: { id: true, topUpBalance: true, creditsLastResetAt: true },
          },
        },
      },
    },
  })

  console.log(`Subscriptions ativas encontradas: ${subscriptions.length}\n`)

  let updatedPeriodStart = 0
  let resetCreditsCount = 0
  let skipped = 0
  let errors = 0

  for (const sub of subscriptions) {
    const orgId = sub.organizationId
    const wallet = sub.organization.creditWallet

    if (!wallet) {
      console.log(`  [SKIP] org=${orgId} — sem CreditWallet`)
      skipped++
      continue
    }

    let stripeSubscription: Stripe.Subscription

    try {
      stripeSubscription = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId)
    } catch (err) {
      console.error(`  [ERROR] org=${orgId} sub=${sub.stripeSubscriptionId} — falha ao buscar no Stripe:`, err)
      errors++
      continue
    }

    const rawPeriodStart = stripeSubscription.items.data[0]?.current_period_start
    if (!rawPeriodStart) {
      console.log(`  [SKIP] org=${orgId} — Stripe não retornou current_period_start`)
      skipped++
      continue
    }

    const periodStart = new Date(rawPeriodStart * 1000)
    const needsReset = !wallet.creditsLastResetAt || periodStart > wallet.creditsLastResetAt

    console.log(`  org=${orgId}`)
    console.log(`    periodStart:       ${periodStart.toISOString()}`)
    console.log(`    creditsLastReset:  ${wallet.creditsLastResetAt?.toISOString() ?? 'nunca'}`)
    console.log(`    needsReset:        ${needsReset}`)

    if (!isDryRun) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { currentPeriodStart: periodStart },
      })
      updatedPeriodStart++

      if (needsReset) {
        const monthlyLimit = await resolveMonthlyLimit(orgId)
        await resetCredits(orgId, wallet.id, wallet.topUpBalance, monthlyLimit, periodStart)
        console.log(`    → Créditos resetados (limite: ${monthlyLimit})`)
        resetCreditsCount++
      }
    } else {
      updatedPeriodStart++
      if (needsReset) resetCreditsCount++
    }

    console.log()
  }

  console.log('=== Resumo ===')
  console.log(`  currentPeriodStart atualizado: ${updatedPeriodStart}`)
  console.log(`  Créditos resetados:            ${resetCreditsCount}`)
  console.log(`  Ignorados (sem wallet/dados):  ${skipped}`)
  console.log(`  Erros:                         ${errors}`)
  if (isDryRun) console.log('\n  [DRY RUN] Nenhuma alteração foi salva.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

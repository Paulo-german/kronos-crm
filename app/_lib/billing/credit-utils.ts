import { db } from '@/_lib/prisma'

const FEATURE_KEY = 'ai.monthly_credits'

type PrismaClient = Parameters<Parameters<typeof db.$transaction>[0]>[0]

interface BalanceResult {
  available: number
  planBalance: number
  topUpBalance: number
  monthlyLimit: number
}

/**
 * Resolve o limite mensal de créditos IA para a organização.
 * Segue a mesma lógica de getEffectivePlan (plan-limits.ts):
 * 1. planOverride → usa o plano override
 * 2. Subscription ativa/trialing → usa o plano da subscription
 * 3. Trial ativo → usa plano 'essential' como fallback
 * 4. Nenhum → retorna 0
 *
 * @param tx - Prisma transaction client (opcional). Se passado, roda dentro da transação.
 */
export async function resolveMonthlyLimit(
  orgId: string,
  tx?: PrismaClient,
): Promise<number> {
  const prisma = tx ?? db

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      trialEndsAt: true,
      planOverride: { select: { id: true } },
    },
  })

  let planId: string | null = null

  if (org?.planOverride) {
    planId = org.planOverride.id
  } else {
    const subscription = await prisma.subscription.findFirst({
      where: {
        organizationId: orgId,
        status: { in: ['active', 'trialing'] },
      },
      select: { planId: true },
      orderBy: { createdAt: 'desc' },
    })

    if (subscription?.planId) {
      planId = subscription.planId
    } else if (org?.trialEndsAt && org.trialEndsAt > new Date()) {
      const essentialPlan = await prisma.plan.findUnique({
        where: { slug: 'essential' },
        select: { id: true },
      })
      planId = essentialPlan?.id ?? null
    }
  }

  if (!planId) {
    return 0
  }

  const planLimit = await prisma.planLimit.findFirst({
    where: {
      planId,
      feature: { key: FEATURE_KEY },
    },
    select: { valueNumber: true },
  })

  return planLimit?.valueNumber ?? 0
}

/**
 * Retorna o período corrente (ano + mês) no fuso de São Paulo.
 */
function getCurrentPeriod(): { periodYear: number; periodMonth: number } {
  const now = new Date()
  return {
    periodYear: now.getFullYear(),
    periodMonth: now.getMonth() + 1,
  }
}

/**
 * Consulta o gasto do mês corrente em créditos (AiUsage.totalCreditsSpent).
 */
async function getCurrentMonthSpent(
  orgId: string,
  tx?: PrismaClient,
): Promise<number> {
  const prisma = tx ?? db
  const { periodYear, periodMonth } = getCurrentPeriod()

  const usage = await prisma.aiUsage.findUnique({
    where: {
      organizationId_periodYear_periodMonth: {
        organizationId: orgId,
        periodYear,
        periodMonth,
      },
    },
    select: { totalCreditsSpent: true },
  })

  return usage?.totalCreditsSpent ?? 0
}

/**
 * Consulta o saldo disponível da organização usando saldo derivado.
 * available = monthlyLimit - currentMonthSpent + topUpBalance
 */
export async function checkBalance(orgId: string): Promise<BalanceResult> {
  const [monthlyLimit, monthSpent, wallet] = await Promise.all([
    resolveMonthlyLimit(orgId),
    getCurrentMonthSpent(orgId),
    db.creditWallet.findUnique({
      where: { organizationId: orgId },
      select: { topUpBalance: true },
    }),
  ])

  const topUpBalance = wallet?.topUpBalance ?? 0
  const planBalance = Math.max(0, monthlyLimit - monthSpent)
  const available = planBalance + topUpBalance

  return { available, planBalance, topUpBalance, monthlyLimit }
}

/**
 * Debita créditos usando saldo derivado + transação atômica.
 * Consome franquia do plano primeiro (via AiUsage.totalCreditsSpent), depois topUpBalance.
 * Cria WalletTransaction com snapshots derivados e incrementa AiUsage do mês.
 * Retorna false se saldo insuficiente (sem throw — quem chama decide).
 *
 * @param incrementMessages - Se true (padrão), incrementa totalMessagesUsed por 1.
 *   Passar false em ajustes/refunds onde não há nova mensagem.
 */
export async function debitCredits(
  orgId: string,
  amount: number,
  description: string,
  metadata?: Record<string, string | number | boolean | null | undefined>,
  incrementMessages = true,
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const wallet = await tx.creditWallet.findUnique({
      where: { organizationId: orgId },
    })

    if (!wallet) {
      return false
    }

    // Saldo derivado: monthlyLimit - gastoDoMês + topUp
    const monthlyLimit = await resolveMonthlyLimit(orgId, tx)
    const monthSpent = await getCurrentMonthSpent(orgId, tx)
    const planAvailable = Math.max(0, monthlyLimit - monthSpent)
    const totalAvailable = planAvailable + wallet.topUpBalance

    if (totalAvailable < amount) {
      return false
    }

    // Consumir franquia do plano primeiro (incrementar totalCreditsSpent)
    const planDebit = Math.min(planAvailable, amount)
    const topUpDebit = amount - planDebit

    // Atualizar topUpBalance se overflow
    if (topUpDebit > 0) {
      await tx.creditWallet.update({
        where: { id: wallet.id },
        data: {
          topUpBalance: { decrement: topUpDebit },
        },
      })
    }

    // Snapshots derivados para auditoria
    const newPlanBalance = planAvailable - planDebit
    const newTopUpBalance = wallet.topUpBalance - topUpDebit

    // Criar transação de auditoria
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'USAGE_DEBIT',
        amount: -amount,
        balanceAfterPlan: newPlanBalance,
        balanceAfterTopUp: newTopUpBalance,
        description,
        metadata: metadata
          ? (metadata as Record<string, string | number | boolean | null>)
          : undefined,
      },
    })

    // Incrementar AiUsage do mês corrente
    const { periodYear, periodMonth } = getCurrentPeriod()

    await tx.aiUsage.upsert({
      where: {
        organizationId_periodYear_periodMonth: {
          organizationId: orgId,
          periodYear,
          periodMonth,
        },
      },
      create: {
        organizationId: orgId,
        periodYear,
        periodMonth,
        totalMessagesUsed: incrementMessages ? 1 : 0,
        totalCreditsSpent: planDebit,
      },
      update: {
        ...(incrementMessages
          ? { totalMessagesUsed: { increment: 1 } }
          : {}),
        totalCreditsSpent: { increment: planDebit },
      },
    })

    return true
  })
}

/**
 * Reembolsa créditos após o débito otimista (quando custo real < estimado).
 * Devolve à franquia do plano primeiro (decrementa totalCreditsSpent),
 * e se o refund exceder o que foi gasto do plano, o excesso vai para topUpBalance.
 * NÃO decrementa totalMessagesUsed (a mensagem foi processada).
 */
export async function refundCredits(
  orgId: string,
  amount: number,
  description: string,
  metadata?: Record<string, string | number | boolean | null | undefined>,
): Promise<void> {
  if (amount <= 0) return

  await db.$transaction(async (tx) => {
    const wallet = await tx.creditWallet.findUnique({
      where: { organizationId: orgId },
    })

    if (!wallet) return

    const { periodYear, periodMonth } = getCurrentPeriod()

    // Ler gasto atual do mês para não decrementar abaixo de 0
    const currentUsage = await tx.aiUsage.findUnique({
      where: {
        organizationId_periodYear_periodMonth: {
          organizationId: orgId,
          periodYear,
          periodMonth,
        },
      },
      select: { totalCreditsSpent: true },
    })

    const currentSpent = currentUsage?.totalCreditsSpent ?? 0

    // Devolver à franquia do plano até o máximo gasto, overflow vai para topUp
    const planRefund = Math.min(amount, currentSpent)
    const topUpRefund = amount - planRefund

    if (planRefund > 0) {
      await tx.aiUsage.update({
        where: {
          organizationId_periodYear_periodMonth: {
            organizationId: orgId,
            periodYear,
            periodMonth,
          },
        },
        data: {
          totalCreditsSpent: { decrement: planRefund },
        },
      })
    }

    if (topUpRefund > 0) {
      await tx.creditWallet.update({
        where: { id: wallet.id },
        data: {
          topUpBalance: { increment: topUpRefund },
        },
      })
    }

    // Snapshot pós-refund para auditoria
    const monthlyLimit = await resolveMonthlyLimit(orgId, tx)
    const newPlanBalance = Math.max(0, monthlyLimit - (currentSpent - planRefund))
    const newTopUpBalance = wallet.topUpBalance + topUpRefund

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'SYSTEM_REFUND',
        amount: +amount,
        balanceAfterPlan: newPlanBalance,
        balanceAfterTopUp: newTopUpBalance,
        description,
        metadata: metadata
          ? (metadata as Record<string, string | number | boolean | null>)
          : undefined,
      },
    })
  })
}

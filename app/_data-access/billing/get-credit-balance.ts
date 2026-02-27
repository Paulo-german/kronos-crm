import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { checkBalance } from '@/_lib/billing/credit-utils'
import { db } from '@/_lib/prisma'

export interface CreditBalance {
  available: number
  planBalance: number
  topUpBalance: number
  monthlyLimit: number
}

const FEATURE_KEY = 'ai.monthly_credits'

/**
 * Retorna o saldo de créditos IA da organização + limite mensal do plano.
 * Usa cache com tag `credits:${orgId}` para invalidação nas actions de débito.
 */
export const getCreditBalance = cache(async (orgId: string): Promise<CreditBalance> => {
  const getCached = unstable_cache(
    async (): Promise<CreditBalance> => {
      const balance = await checkBalance(orgId)

      // Buscar limite mensal do plano efetivo
      const monthlyLimit = await resolveMonthlyLimit(orgId)

      return {
        available: balance.available,
        planBalance: balance.planBalance,
        topUpBalance: balance.topUpBalance,
        monthlyLimit,
      }
    },
    [`credit-balance-${orgId}`],
    {
      tags: [`credits:${orgId}`, `subscriptions:${orgId}`],
      revalidate: 300,
    },
  )

  return getCached()
})

/**
 * Resolve o limite mensal de créditos IA para a organização.
 * Segue a mesma lógica de getEffectivePlan (plan-limits.ts):
 * 1. planOverride → usa o plano override
 * 2. Subscription ativa/trialing → usa o plano da subscription
 * 3. Trial ativo → usa plano 'essential' como fallback
 * 4. Nenhum → retorna 0
 */
async function resolveMonthlyLimit(orgId: string): Promise<number> {
  const org = await db.organization.findUnique({
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
    const subscription = await db.subscription.findFirst({
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
      const essentialPlan = await db.plan.findUnique({
        where: { slug: 'essential' },
        select: { id: true },
      })
      planId = essentialPlan?.id ?? null
    }
  }

  if (!planId) {
    return 0
  }

  const planLimit = await db.planLimit.findFirst({
    where: {
      planId,
      feature: { key: FEATURE_KEY },
    },
    select: { valueNumber: true },
  })

  return planLimit?.valueNumber ?? 0
}

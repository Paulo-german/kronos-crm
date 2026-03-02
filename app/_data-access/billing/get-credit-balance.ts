import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { checkBalance } from '@/_lib/billing/credit-utils'

export interface CreditBalance {
  available: number
  planBalance: number
  topUpBalance: number
  monthlyLimit: number
}

/**
 * Retorna o saldo de créditos IA da organização + limite mensal do plano.
 * O saldo é derivado: available = monthlyLimit - monthSpent + topUpBalance.
 * Usa cache com tag `credits:${orgId}` para invalidação nas actions de débito.
 * TTL de 60s (Trigger.dev não pode chamar revalidateTag).
 */
export const getCreditBalance = cache(async (orgId: string): Promise<CreditBalance> => {
  const getCached = unstable_cache(
    async (): Promise<CreditBalance> => {
      const balance = await checkBalance(orgId)

      return {
        available: balance.available,
        planBalance: balance.planBalance,
        topUpBalance: balance.topUpBalance,
        monthlyLimit: balance.monthlyLimit,
      }
    },
    [`credit-balance-${orgId}`],
    {
      tags: [`credits:${orgId}`, `subscriptions:${orgId}`],
      revalidate: 60,
    },
  )

  return getCached()
})

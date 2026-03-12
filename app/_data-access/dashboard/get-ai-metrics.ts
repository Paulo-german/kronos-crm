import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getCreditBalance } from '@/_data-access/billing/get-credit-balance'
import type { AiMetrics, AiMonthlyHistory } from './types'

async function fetchAiMetrics(orgId: string): Promise<AiMetrics> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [creditBalance, currentUsage, historyUsages, agents] =
    await Promise.all([
      getCreditBalance(orgId),
      db.aiUsage.findUnique({
        where: {
          organizationId_periodYear_periodMonth: {
            organizationId: orgId,
            periodYear: currentYear,
            periodMonth: currentMonth,
          },
        },
        select: {
          totalCreditsSpent: true,
          totalMessagesUsed: true,
        },
      }),
      db.aiUsage.findMany({
        where: {
          organizationId: orgId,
          OR: Array.from({ length: 6 }, (_, index) => {
            const date = subMonths(now, index)
            return {
              periodYear: date.getFullYear(),
              periodMonth: date.getMonth() + 1,
            }
          }),
        },
        select: {
          periodYear: true,
          periodMonth: true,
          totalCreditsSpent: true,
          totalMessagesUsed: true,
        },
      }),
      db.agent.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          modelId: true,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

  // Monta histórico dos últimos 6 meses (mais antigo primeiro)
  const historyMap = new Map(
    historyUsages.map((usage) => [
      `${usage.periodYear}-${String(usage.periodMonth).padStart(2, '0')}`,
      usage,
    ]),
  )

  const monthlyHistory: AiMonthlyHistory[] = Array.from(
    { length: 6 },
    (_, index) => {
      const date = subMonths(now, 5 - index)
      const key = format(date, 'yyyy-MM')
      const usage = historyMap.get(key)
      return {
        month: key,
        label: format(date, 'MMM', { locale: ptBR }),
        creditsSpent: usage?.totalCreditsSpent ?? 0,
        messagesUsed: usage?.totalMessagesUsed ?? 0,
      }
    },
  )

  const activeAgents = agents.filter((agent) => agent.isActive).length

  return {
    creditsUsed: currentUsage?.totalCreditsSpent ?? 0,
    messagesCount: currentUsage?.totalMessagesUsed ?? 0,
    monthlyLimit: creditBalance.monthlyLimit,
    availableBalance: creditBalance.available,
    topUpBalance: creditBalance.topUpBalance,
    activeAgents,
    totalAgents: agents.length,
    agents,
    monthlyHistory,
  }
}

export const getAiMetrics = cache(async (orgId: string): Promise<AiMetrics> => {
  const getCached = unstable_cache(
    async () => fetchAiMetrics(orgId),
    [`dashboard-ai-${orgId}`],
    {
      tags: [
        `dashboard-ai:${orgId}`,
        `credits:${orgId}`,
        `agents:${orgId}`,
      ],
      revalidate: 3600,
    },
  )

  return getCached()
})

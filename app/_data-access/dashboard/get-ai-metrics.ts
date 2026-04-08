import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { eachMonthOfInterval, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { db } from '@/_lib/prisma'
import { getCreditBalance } from '@/_data-access/billing/get-credit-balance'
import { getPreviousPeriod } from '@/_utils/date-range'
import type { AgentBreakdownEntry, AiMetrics, AiMonthlyHistory, DateRange } from './types'

// Converte um Date em { periodYear, periodMonth } para filtro de AiUsage
function toUsagePeriod(date: Date) {
  return {
    periodYear: date.getFullYear(),
    periodMonth: date.getMonth() + 1,
  }
}

async function fetchAiMetrics(
  orgId: string,
  dateRange: DateRange,
): Promise<AiMetrics> {
  const previousPeriod = getPreviousPeriod(dateRange)

  // Meses do período selecionado (mais antigo ao mais recente)
  const rangeMonths = eachMonthOfInterval({
    start: dateRange.start,
    end: dateRange.end,
  })

  // Meses do período anterior para calcular variação
  const prevMonths = eachMonthOfInterval({
    start: previousPeriod.start,
    end: previousPeriod.end,
  })

  const rangeMonthFilters = rangeMonths.map(toUsagePeriod)
  const prevMonthFilters = prevMonths.map(toUsagePeriod)

  const [creditBalance, rangeUsages, prevUsages, agents, executionTotals, executionByStatus] =
    await Promise.all([
      getCreditBalance(orgId),

      // Registros de uso no período selecionado
      db.aiUsage.findMany({
        where: { organizationId: orgId, OR: rangeMonthFilters },
        select: {
          periodYear: true,
          periodMonth: true,
          totalCreditsSpent: true,
          totalMessagesUsed: true,
        },
      }),

      // Registros de uso no período anterior (para cálculo de variação)
      db.aiUsage.findMany({
        where: { organizationId: orgId, OR: prevMonthFilters },
        select: {
          totalCreditsSpent: true,
          totalMessagesUsed: true,
        },
      }),

      // Lista de agentes configurados na org
      db.agent.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, modelId: true, isActive: true },
        orderBy: { createdAt: 'desc' },
      }),

      // Totais de execuções por agente (créditos + duração) no período
      db.agentExecution.groupBy({
        by: ['agentId'],
        where: {
          organizationId: orgId,
          startedAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
        _sum: { creditsCost: true, durationMs: true },
      }),

      // Contagem de execuções por agente E por status no período
      db.agentExecution.groupBy({
        by: ['agentId', 'status'],
        where: {
          organizationId: orgId,
          startedAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
      }),
    ])

  // Monta o histórico mensal para o chart (cada mês do range, mais antigo primeiro)
  const usageMap = new Map(
    rangeUsages.map((usage) => [
      `${usage.periodYear}-${String(usage.periodMonth).padStart(2, '0')}`,
      usage,
    ]),
  )

  const monthlyHistory: AiMonthlyHistory[] = rangeMonths.map((monthDate) => {
    const key = format(monthDate, 'yyyy-MM')
    const usage = usageMap.get(key)
    return {
      month: key,
      label: format(monthDate, 'MMM', { locale: ptBR }),
      creditsSpent: usage?.totalCreditsSpent ?? 0,
      messagesUsed: usage?.totalMessagesUsed ?? 0,
    }
  })

  // KPIs do período selecionado
  const creditsUsed = rangeUsages.reduce(
    (sum, usage) => sum + usage.totalCreditsSpent,
    0,
  )
  const messagesCount = rangeUsages.reduce(
    (sum, usage) => sum + usage.totalMessagesUsed,
    0,
  )

  // KPIs do período anterior para calcular variação percentual
  const prevCreditsUsed = prevUsages.reduce(
    (sum, usage) => sum + usage.totalCreditsSpent,
    0,
  )
  const prevMessagesCount = prevUsages.reduce(
    (sum, usage) => sum + usage.totalMessagesUsed,
    0,
  )

  // Monta lookup de nome dos agentes para enriquecer o breakdown
  const agentNameById = new Map(agents.map((agent) => [agent.id, agent.name]))

  // Indexa os totais por agentId para cruzar com os status
  const totalsByAgentId = new Map(
    executionTotals.map((row) => [row.agentId, row]),
  )

  // Agrupa contagens por status dentro de cada agentId
  type StatusCounts = { COMPLETED: number; FAILED: number; SKIPPED: number }
  const statusByAgentId = new Map<string | null, StatusCounts>()

  for (const row of executionByStatus) {
    const key = row.agentId
    const existing = statusByAgentId.get(key) ?? {
      COMPLETED: 0,
      FAILED: 0,
      SKIPPED: 0,
    }
    existing[row.status] = (existing[row.status] ?? 0) + row._count.id
    statusByAgentId.set(key, existing)
  }

  // Monta o breakdown final cruzando totais + status + nomes
  const agentBreakdown: AgentBreakdownEntry[] = Array.from(
    totalsByAgentId.entries(),
  )
    .map(([agentId, totals]) => {
      const statusCounts = statusByAgentId.get(agentId) ?? {
        COMPLETED: 0,
        FAILED: 0,
        SKIPPED: 0,
      }
      const totalExecutions = totals._count.id
      const completedCount = statusCounts.COMPLETED
      const failedCount = statusCounts.FAILED
      const skippedCount = statusCounts.SKIPPED
      const totalCredits = totals._sum.creditsCost ?? 0
      const totalDurationMs = totals._sum.durationMs ?? 0

      return {
        agentId,
        agentName:
          agentId !== null ? (agentNameById.get(agentId) ?? agentId) : 'Router',
        totalExecutions,
        completedCount,
        failedCount,
        skippedCount,
        successRate:
          totalExecutions > 0 ? (completedCount / totalExecutions) * 100 : 0,
        totalCredits,
        avgDurationMs:
          totalExecutions > 0 ? totalDurationMs / totalExecutions : 0,
      }
    })
    // Agentes que mais consomem créditos aparecem primeiro
    .sort((a, b) => b.totalCredits - a.totalCredits)

  const activeAgents = agents.filter((agent) => agent.isActive).length

  return {
    creditsUsed,
    messagesCount,
    monthlyLimit: creditBalance.monthlyLimit,
    availableBalance: creditBalance.available,
    topUpBalance: creditBalance.topUpBalance,
    activeAgents,
    totalAgents: agents.length,
    agents,
    monthlyHistory,
    prevCreditsUsed,
    prevMessagesCount,
    agentBreakdown,
  }
}

export const getAiMetrics = cache(
  async (orgId: string, dateRange: DateRange): Promise<AiMetrics> => {
    // Date objects serializam de forma inconsistente no unstable_cache —
    // convertemos para ISO string para garantir cache key estável e determinística
    const rangeKey = `${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`

    const getCached = unstable_cache(
      async () => fetchAiMetrics(orgId, dateRange),
      [`dashboard-ai-${orgId}-${rangeKey}`],
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
  },
)

import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildDashboardWhere } from './build-dashboard-where'
import type { DashboardFilters, DateRange, KpiMetrics } from './types'

async function fetchKpiMetrics(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  prevRange: DateRange,
  filters: DashboardFilters,
): Promise<KpiMetrics> {
  // Filtros base sem restrição de status — pipelineAgg e newLeads capturam todos os deals ativos/criados
  const baseWhere = buildDashboardWhere(orgId, userId, elevated, filters)

  // Deals finalizados (WON) não são "inativos"; updatedAt é usado como dateRange, então ignora inactiveDays
  const wonBaseWhere = buildDashboardWhere(orgId, userId, elevated, filters, {
    ignoreInactiveDays: true,
  })

  const [
    pipelineAgg,
    wonAgg,
    avgAgg,
    newLeads,
    prevPipelineAgg,
    prevWonAgg,
    prevAvgAgg,
    prevNewLeads,
  ] = await Promise.all([
    // Valor total do pipeline (OPEN + IN_PROGRESS) — snapshot ALL TIME
    db.deal.aggregate({
      _sum: { value: true },
      where: { ...baseWhere, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    // Receita (WON no período)
    db.deal.aggregate({
      _sum: { value: true },
      where: {
        ...wonBaseWhere,
        status: 'WON',
        updatedAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    // Ticket médio (WON no período)
    db.deal.aggregate({
      _avg: { value: true },
      where: {
        ...wonBaseWhere,
        status: 'WON',
        updatedAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    // Novos leads (criados no período)
    db.deal.count({
      where: { ...baseWhere, createdAt: { gte: dateRange.start, lte: dateRange.end } },
    }),
    // Pipeline não tem período anterior (é snapshot ALL TIME)
    db.deal.aggregate({
      _sum: { value: true },
      where: { ...baseWhere, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    db.deal.aggregate({
      _sum: { value: true },
      where: {
        ...wonBaseWhere,
        status: 'WON',
        updatedAt: { gte: prevRange.start, lte: prevRange.end },
      },
    }),
    db.deal.aggregate({
      _avg: { value: true },
      where: {
        ...wonBaseWhere,
        status: 'WON',
        updatedAt: { gte: prevRange.start, lte: prevRange.end },
      },
    }),
    db.deal.count({
      where: { ...baseWhere, createdAt: { gte: prevRange.start, lte: prevRange.end } },
    }),
  ])

  return {
    totalPipelineValue: Number(pipelineAgg._sum.value ?? 0),
    wonDealsValue: Number(wonAgg._sum.value ?? 0),
    avgTicket: Number(avgAgg._avg.value ?? 0),
    newLeadsCount: newLeads,
    prevPipelineValue: Number(prevPipelineAgg._sum.value ?? 0),
    prevWonDealsValue: Number(prevWonAgg._sum.value ?? 0),
    prevAvgTicket: Number(prevAvgAgg._avg.value ?? 0),
    prevNewLeadsCount: prevNewLeads,
  }
}

export const getKpiMetrics = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    prevRange: DateRange,
    filters: DashboardFilters,
  ): Promise<KpiMetrics> => {
    const elevated = isElevated(ctx.userRole)
    const startISO = dateRange.start.toISOString()
    const endISO = dateRange.end.toISOString()
    const filtersKey = JSON.stringify({
      a: filters.assignee ?? '',
      s: filters.status ?? [],
      p: filters.priority ?? [],
      id: filters.inactiveDays ?? 0,
      pr: filters.productId ?? '',
      pi: filters.pipelineId ?? '',
    })

    const getCached = unstable_cache(
      async () =>
        fetchKpiMetrics(ctx.orgId, ctx.userId, elevated, dateRange, prevRange, filters),
      [
        `dashboard-kpi-${ctx.orgId}-${ctx.userId}-${elevated}-${startISO}-${endISO}-${filtersKey}`,
      ],
      {
        tags: [`dashboard:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)

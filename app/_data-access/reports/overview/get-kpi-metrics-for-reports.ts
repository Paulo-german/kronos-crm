import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'
import { getPreviousPeriod } from '@/_utils/date-range'
import { buildReportsWhere } from '../shared/build-reports-where'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { DateRange, ReportsFilters } from '../shared/reports-types'
import type { KpiMetrics } from '@/_data-access/dashboard/types'

const CACHE_REVALIDATE_SECONDS = 3600

// Reexporta o DTO da camada de dashboard — reports é apenas uma view com tag de cache distinta
export type { KpiMetrics } from '@/_data-access/dashboard/types'

async function fetchKpiMetricsForReports(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  prevRange: DateRange,
  filters: ReportsFilters,
): Promise<KpiMetrics> {
  // Ignoramos o filtro de status (UI) porque cada agregação fixa o próprio status (OPEN/IN_PROGRESS, WON).
  // Filtros temporais são por agregação: pipeline é snapshot all-time, WON usa updatedAt, leads usa createdAt.
  const baseWhere = buildReportsWhere(orgId, userId, elevated, filters, {
    ignoreStatus: true,
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
    db.deal.aggregate({
      _sum: { value: true },
      where: { ...baseWhere, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    db.deal.aggregate({
      _sum: { value: true },
      where: {
        ...baseWhere,
        status: 'WON',
        updatedAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    db.deal.aggregate({
      _avg: { value: true },
      where: {
        ...baseWhere,
        status: 'WON',
        updatedAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    db.deal.count({
      where: { ...baseWhere, createdAt: { gte: dateRange.start, lte: dateRange.end } },
    }),
    // Pipeline é snapshot ALL TIME — período anterior repete o snapshot atual
    db.deal.aggregate({
      _sum: { value: true },
      where: { ...baseWhere, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    db.deal.aggregate({
      _sum: { value: true },
      where: {
        ...baseWhere,
        status: 'WON',
        updatedAt: { gte: prevRange.start, lte: prevRange.end },
      },
    }),
    db.deal.aggregate({
      _avg: { value: true },
      where: {
        ...baseWhere,
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

export const getKpiMetricsForReports = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: ReportsFilters,
  ): Promise<KpiMetrics> => {
    const elevated = isElevated(ctx.userRole)
    const prevRange = getPreviousPeriod(dateRange)

    const getCached = unstable_cache(
      async () =>
        fetchKpiMetricsForReports(
          ctx.orgId,
          ctx.userId,
          elevated,
          dateRange,
          prevRange,
          filters,
        ),
      makeReportsCacheKey('kpi', ctx, dateRange, { ...filters }),
      {
        tags: [`reports:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)

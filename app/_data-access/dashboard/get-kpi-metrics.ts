import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { DateRange, KpiMetrics } from './types'

function buildRbacWhere(orgId: string, userId: string, elevated: boolean) {
  return {
    organizationId: orgId,
    ...(elevated ? {} : { assignedTo: userId }),
  }
}

async function fetchKpiMetrics(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  prevRange: DateRange,
  pipelineId?: string,
): Promise<KpiMetrics> {
  const rbac = buildRbacWhere(orgId, userId, elevated)
  const pipelineFilter = pipelineId ? { stage: { pipelineId } } : {}

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
      where: { ...rbac, ...pipelineFilter, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    // Receita (WON no período)
    db.deal.aggregate({
      _sum: { value: true },
      where: {
        ...rbac,
        ...pipelineFilter,
        status: 'WON',
        updatedAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    // Ticket médio (WON no período)
    db.deal.aggregate({
      _avg: { value: true },
      where: {
        ...rbac,
        ...pipelineFilter,
        status: 'WON',
        updatedAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    // Novos leads (criados no período)
    db.deal.count({
      where: {
        ...rbac,
        ...pipelineFilter,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    // Pipeline não tem período anterior (é snapshot ALL TIME)
    db.deal.aggregate({
      _sum: { value: true },
      where: { ...rbac, ...pipelineFilter, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    db.deal.aggregate({
      _sum: { value: true },
      where: {
        ...rbac,
        ...pipelineFilter,
        status: 'WON',
        updatedAt: { gte: prevRange.start, lte: prevRange.end },
      },
    }),
    db.deal.aggregate({
      _avg: { value: true },
      where: {
        ...rbac,
        ...pipelineFilter,
        status: 'WON',
        updatedAt: { gte: prevRange.start, lte: prevRange.end },
      },
    }),
    db.deal.count({
      where: {
        ...rbac,
        ...pipelineFilter,
        createdAt: { gte: prevRange.start, lte: prevRange.end },
      },
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
    pipelineId?: string,
  ): Promise<KpiMetrics> => {
    const elevated = isElevated(ctx.userRole)

    const getCached = unstable_cache(
      async () =>
        fetchKpiMetrics(ctx.orgId, ctx.userId, elevated, dateRange, prevRange, pipelineId),
      [
        `dashboard-kpi-${ctx.orgId}-${ctx.userId}-${elevated}`,
        dateRange.start.toISOString(),
        dateRange.end.toISOString(),
        pipelineId ?? 'all',
      ],
      {
        tags: [`dashboard:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)

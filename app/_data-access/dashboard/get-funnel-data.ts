import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildDashboardWhere } from './build-dashboard-where'
import type { DashboardFilters, DateRange, FunnelData, FunnelStage } from './types'

async function fetchFunnelData(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: DashboardFilters,
): Promise<FunnelData> {
  const where = buildDashboardWhere(orgId, userId, elevated, filters)
  const dateWhere = { createdAt: { gte: dateRange.start, lte: dateRange.end } }

  const [groups, stages, totalDeals, wonDeals] = await Promise.all([
    db.deal.groupBy({
      by: ['pipelineStageId'],
      _count: { _all: true },
      _sum: { value: true },
      where: { ...where, ...dateWhere },
    }),
    db.pipelineStage.findMany({
      where: {
        pipeline: {
          organizationId: orgId,
          ...(filters.pipelineId ? { id: filters.pipelineId } : {}),
        },
      },
      select: { id: true, name: true, color: true, position: true },
      orderBy: { position: 'asc' },
    }),
    // Total de deals no período (para taxa de conversão real)
    db.deal.count({
      where: { ...where, ...dateWhere },
    }),
    // Deals ganhos no período
    db.deal.count({
      where: { ...where, ...dateWhere, status: 'WON' },
    }),
  ])

  const stageData: FunnelStage[] = stages.map((stage) => {
    const group = groups.find((g) => g.pipelineStageId === stage.id)
    return {
      stageId: stage.id,
      stageName: stage.name,
      stageColor: stage.color,
      position: stage.position,
      count: group?._count._all ?? 0,
      value: Number(group?._sum.value ?? 0),
    }
  })

  return {
    stages: stageData,
    totalDeals,
    wonDeals,
  }
}

export const getFunnelData = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: DashboardFilters,
  ): Promise<FunnelData> => {
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
      async () => fetchFunnelData(ctx.orgId, ctx.userId, elevated, dateRange, filters),
      [
        `dashboard-funnel-${ctx.orgId}-${ctx.userId}-${elevated}-${startISO}-${endISO}-${filtersKey}`,
      ],
      {
        tags: [`dashboard-charts:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)

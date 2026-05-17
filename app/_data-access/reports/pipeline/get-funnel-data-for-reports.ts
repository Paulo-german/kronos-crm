import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'
import { buildReportsWhere } from '../shared/build-reports-where'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { DateRange, ReportsFilters } from '../shared/reports-types'
import type { FunnelData, FunnelStage } from '@/_data-access/dashboard/types'

const CACHE_REVALIDATE_SECONDS = 3600

export type { FunnelData, FunnelStage } from '@/_data-access/dashboard/types'

async function fetchFunnelDataForReports(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: ReportsFilters,
): Promise<FunnelData> {
  const where = buildReportsWhere(orgId, userId, elevated, filters)
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
    db.deal.count({
      where: { ...where, ...dateWhere },
    }),
    db.deal.count({
      where: { ...where, ...dateWhere, status: 'WON' },
    }),
  ])

  const stageData: FunnelStage[] = stages.map((stage) => {
    const group = groups.find((groupItem) => groupItem.pipelineStageId === stage.id)
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

export const getFunnelDataForReports = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: ReportsFilters,
  ): Promise<FunnelData> => {
    const elevated = isElevated(ctx.userRole)

    const getCached = unstable_cache(
      async () =>
        fetchFunnelDataForReports(ctx.orgId, ctx.userId, elevated, dateRange, filters),
      makeReportsCacheKey('funnel', ctx, dateRange, { ...filters }),
      {
        tags: [`reports:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)

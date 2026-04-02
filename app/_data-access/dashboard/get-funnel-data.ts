import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { DateRange, FunnelStage } from './types'

async function fetchFunnelData(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  pipelineId?: string,
): Promise<FunnelStage[]> {
  const [groups, stages] = await Promise.all([
    db.deal.groupBy({
      by: ['pipelineStageId'],
      _count: { _all: true },
      _sum: { value: true },
      where: {
        organizationId: orgId,
        ...(elevated ? {} : { assignedTo: userId }),
        ...(pipelineId ? { stage: { pipelineId } } : {}),
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    db.pipelineStage.findMany({
      where: {
        pipeline: {
          organizationId: orgId,
          ...(pipelineId ? { id: pipelineId } : {}),
        },
      },
      select: { id: true, name: true, color: true, position: true },
      orderBy: { position: 'asc' },
    }),
  ])

  return stages.map((stage) => {
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
}

export const getFunnelData = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    pipelineId?: string,
  ): Promise<FunnelStage[]> => {
    const elevated = isElevated(ctx.userRole)
    const startISO = dateRange.start.toISOString()
    const endISO = dateRange.end.toISOString()

    const getCached = unstable_cache(
      async () =>
        fetchFunnelData(ctx.orgId, ctx.userId, elevated, dateRange, pipelineId),
      [
        `dashboard-funnel-${ctx.orgId}-${ctx.userId}-${elevated}-${startISO}-${endISO}-${pipelineId ?? 'all'}`,
      ],
      {
        tags: [`dashboard-charts:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)

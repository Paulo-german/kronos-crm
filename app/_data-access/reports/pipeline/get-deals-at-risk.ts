import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'
import { buildReportsWhere } from '../shared/build-reports-where'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { ReportsFilters } from '../shared/reports-types'

export interface DealAtRisk {
  id: string
  title: string
  value: number
  assigneeName: string
  stageName: string
  daysSinceUpdate: number
}

interface DealsAtRiskOptions {
  inactiveDays: number
  pipelineId?: string
  assignee?: string
  limit?: number
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000
const DEFAULT_LIMIT = 50
const CACHE_REVALIDATE_SECONDS = 3600

async function fetchDealsAtRisk(
  orgId: string,
  userId: string,
  elevated: boolean,
  options: DealsAtRiskOptions,
): Promise<{ deals: DealAtRisk[]; total: number }> {
  const cutoff = new Date(Date.now() - options.inactiveDays * MILLISECONDS_PER_DAY)
  const filters: ReportsFilters = {
    ...(options.pipelineId ? { pipelineId: options.pipelineId } : {}),
    ...(options.assignee ? { assignee: options.assignee } : {}),
  }
  const baseWhere = buildReportsWhere(orgId, userId, elevated, filters, {
    ignoreStatus: true,
  })

  const where = {
    ...baseWhere,
    status: 'OPEN' as const,
    updatedAt: { lt: cutoff },
  }

  const take = options.limit ?? DEFAULT_LIMIT

  const [deals, total] = await Promise.all([
    db.deal.findMany({
      where,
      take,
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true,
        title: true,
        value: true,
        updatedAt: true,
        assignee: { select: { fullName: true } },
        stage: { select: { name: true } },
      },
    }),
    db.deal.count({ where }),
  ])

  const now = Date.now()
  const dealsAtRisk: DealAtRisk[] = deals.map((deal) => {
    const daysSinceUpdate = Math.floor(
      (now - deal.updatedAt.getTime()) / MILLISECONDS_PER_DAY,
    )
    return {
      id: deal.id,
      title: deal.title,
      value: Number(deal.value),
      assigneeName: deal.assignee?.fullName ?? '',
      stageName: deal.stage.name,
      daysSinceUpdate,
    }
  })

  return { deals: dealsAtRisk, total }
}

export const getDealsAtRisk = cache(
  async (
    ctx: RBACContext,
    options: DealsAtRiskOptions,
  ): Promise<{ deals: DealAtRisk[]; total: number }> => {
    const elevated = isElevated(ctx.userRole)

    // Não há dateRange — a query é "live" (compara updatedAt vs NOW). Bucketamos NOW por hora
    // para evitar miss em toda request mantendo frescor razoável. Encapsulamos o bucket como
    // um DateRange sintético para reusar o helper compartilhado de cache keys.
    const hourBucket = Math.floor(Date.now() / MILLISECONDS_PER_HOUR)
    const bucketDate = new Date(hourBucket * MILLISECONDS_PER_HOUR)
    const liveRange = { start: bucketDate, end: bucketDate }

    const getCached = unstable_cache(
      async () => fetchDealsAtRisk(ctx.orgId, ctx.userId, elevated, options),
      makeReportsCacheKey('deals-at-risk', ctx, liveRange, {
        inactiveDays: options.inactiveDays,
        pipelineId: options.pipelineId ?? '',
        assignee: options.assignee ?? '',
        limit: options.limit ?? DEFAULT_LIMIT,
      }),
      {
        tags: [`reports:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)

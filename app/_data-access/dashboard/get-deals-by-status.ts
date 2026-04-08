import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildDashboardWhere } from './build-dashboard-where'
import type { DashboardFilters, DateRange, DealsByStatus } from './types'

async function fetchDealsByStatus(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: DashboardFilters,
): Promise<DealsByStatus[]> {
  // groupBy por status não pode ser filtrado por status — eliminaria categorias do chart
  const where = buildDashboardWhere(orgId, userId, elevated, filters, { ignoreStatus: true })

  const groups = await db.deal.groupBy({
    by: ['status'],
    _count: { _all: true },
    where: { ...where, createdAt: { gte: dateRange.start, lte: dateRange.end } },
  })

  return groups.map((group) => ({
    status: group.status,
    count: group._count._all,
  }))
}

export const getDealsByStatus = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: DashboardFilters,
  ): Promise<DealsByStatus[]> => {
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
      async () => fetchDealsByStatus(ctx.orgId, ctx.userId, elevated, dateRange, filters),
      [
        `dashboard-status-${ctx.orgId}-${ctx.userId}-${elevated}-${startISO}-${endISO}-${filtersKey}`,
      ],
      {
        tags: [`dashboard:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)

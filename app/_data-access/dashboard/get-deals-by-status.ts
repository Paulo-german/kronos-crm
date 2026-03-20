import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { DateRange, DealsByStatus } from './types'

async function fetchDealsByStatus(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
): Promise<DealsByStatus[]> {
  const groups = await db.deal.groupBy({
    by: ['status'],
    _count: { _all: true },
    where: {
      organizationId: orgId,
      ...(elevated ? {} : { assignedTo: userId }),
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    },
  })

  return groups.map((g) => ({
    status: g.status,
    count: g._count._all,
  }))
}

export const getDealsByStatus = cache(
  async (ctx: RBACContext, dateRange: DateRange): Promise<DealsByStatus[]> => {
    const elevated = isElevated(ctx.userRole)
    const startISO = dateRange.start.toISOString()
    const endISO = dateRange.end.toISOString()

    const getCached = unstable_cache(
      async () =>
        fetchDealsByStatus(ctx.orgId, ctx.userId, elevated, dateRange),
      [
        `dashboard-status-${ctx.orgId}-${ctx.userId}-${elevated}-${startISO}-${endISO}`,
      ],
      {
        tags: [`dashboard:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)

import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { DealsByStatus } from './types'

async function fetchDealsByStatus(
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<DealsByStatus[]> {
  const groups = await db.deal.groupBy({
    by: ['status'],
    _count: { _all: true },
    where: {
      organizationId: orgId,
      ...(elevated ? {} : { assignedTo: userId }),
    },
  })

  return groups.map((g) => ({
    status: g.status,
    count: g._count._all,
  }))
}

export const getDealsByStatus = cache(
  async (ctx: RBACContext): Promise<DealsByStatus[]> => {
    const elevated = isElevated(ctx.userRole)

    const getCached = unstable_cache(
      async () => fetchDealsByStatus(ctx.orgId, ctx.userId, elevated),
      [`dashboard-status-${ctx.orgId}-${ctx.userId}-${elevated}`],
      {
        tags: [`dashboard:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: 300,
      },
    )

    return getCached()
  },
)

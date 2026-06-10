import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { RecentActivity } from './types'

async function fetchRecentActivities(
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<RecentActivity[]> {
  const activities = await db.activity.findMany({
    where: {
      deal: {
        organizationId: orgId,
        ...(elevated ? {} : { assignedTo: userId }),
      },
    },
    include: {
      performer: { select: { fullName: true, avatarUrl: true } },
      deal: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
  })

  return activities.map((activity) => ({
    id: activity.id,
    type: activity.type,
    content: activity.content,
    createdAt: activity.createdAt,
    dealId: activity.deal.id,
    dealTitle: activity.deal.title,
    performerName: activity.performer?.fullName ?? null,
    performerAvatar: activity.performer?.avatarUrl ?? null,
  }))
}

export const getRecentActivities = cache(
  async (ctx: RBACContext): Promise<RecentActivity[]> => {
    const elevated = isElevated(ctx.userRole)

    const getCached = unstable_cache(
      async () => fetchRecentActivities(ctx.orgId, ctx.userId, elevated),
      [`dashboard-activities-${ctx.orgId}-${ctx.userId}-${elevated}`],
      {
        tags: [`dashboard:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)

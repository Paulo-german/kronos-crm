import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildInboxDashboardWhere } from './build-inbox-dashboard-where'
import type { DateRange } from './types'
import type { ChannelDistribution, InboxDashboardFilters } from './inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600

async function fetchChannelDistribution(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: InboxDashboardFilters,
): Promise<ChannelDistribution[]> {
  const baseWhere = buildInboxDashboardWhere(orgId, userId, elevated, filters)

  const groups = await db.conversation.groupBy({
    by: ['channel'],
    _count: { _all: true },
    where: {
      ...baseWhere,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    },
    orderBy: { _count: { channel: 'desc' } },
  })

  return groups.map((group) => ({
    channel: group.channel,
    count: group._count._all,
  }))
}

export const getChannelDistribution = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: InboxDashboardFilters,
  ): Promise<ChannelDistribution[]> => {
    const elevated = isElevated(ctx.userRole)
    const startISO = dateRange.start.toISOString()
    const endISO = dateRange.end.toISOString()
    const filtersKey = JSON.stringify({
      ch: filters.channel ?? '',
      as: filters.assignee ?? '',
      la: filters.labelId ?? '',
      st: filters.status ?? '',
      ai: filters.aiVsHuman ?? '',
    })

    const getCached = unstable_cache(
      async () =>
        fetchChannelDistribution(ctx.orgId, ctx.userId, elevated, dateRange, filters),
      [
        `inbox-channel-${ctx.orgId}-${ctx.userId}-${elevated}-${startISO}-${endISO}-${filtersKey}`,
      ],
      {
        tags: [`conversations:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)

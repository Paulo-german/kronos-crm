import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildInboxDashboardWhere } from './build-inbox-dashboard-where'
import { buildInboxFiltersKey } from './_shared/build-inbox-filters-key'
import type { DateRange } from './types'
import type {
  ChannelDistribution,
  InboxDashboardFilters,
} from './inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600

async function fetchChannelDistribution(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: InboxDashboardFilters,
): Promise<ChannelDistribution[]> {
  const baseWhere = buildInboxDashboardWhere(orgId, userId, elevated, filters)

  // findMany (em vez de groupBy) para computar, na mesma passada, a contagem
  // por canal e o tempo médio de 1ª resposta por canal (benchmark entre canais).
  const conversations = await db.conversation.findMany({
    where: {
      ...baseWhere,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    },
    select: {
      channel: true,
      createdAt: true,
      messages: {
        where: { role: 'assistant' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  })

  const byChannel = new Map<
    string,
    { count: number; responseTimes: number[] }
  >()

  for (const conversation of conversations) {
    const entry = byChannel.get(conversation.channel) ?? {
      count: 0,
      responseTimes: [],
    }
    entry.count += 1

    const firstReply = conversation.messages[0]
    if (firstReply) {
      entry.responseTimes.push(
        firstReply.createdAt.getTime() - conversation.createdAt.getTime(),
      )
    }

    byChannel.set(conversation.channel, entry)
  }

  return Array.from(byChannel.entries())
    .map(([channel, entry]) => ({
      channel,
      count: entry.count,
      avgFirstResponseTimeMs:
        entry.responseTimes.length > 0
          ? Math.round(
              entry.responseTimes.reduce((sum, ms) => sum + ms, 0) /
                entry.responseTimes.length,
            )
          : null,
    }))
    .sort((channelA, channelB) => channelB.count - channelA.count)
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
    const filtersKey = buildInboxFiltersKey(filters)

    const getCached = unstable_cache(
      async () =>
        fetchChannelDistribution(
          ctx.orgId,
          ctx.userId,
          elevated,
          dateRange,
          filters,
        ),
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

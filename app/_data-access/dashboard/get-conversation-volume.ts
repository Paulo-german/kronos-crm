import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { format, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildInboxDashboardWhere } from './build-inbox-dashboard-where'
import type { DateRange } from './types'
import type { ConversationVolumeByDay, InboxDashboardFilters } from './inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600

async function fetchConversationVolume(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: InboxDashboardFilters,
): Promise<ConversationVolumeByDay[]> {
  const baseWhere = buildInboxDashboardWhere(orgId, userId, elevated, filters)

  const [opened, resolved] = await Promise.all([
    db.conversation.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: { createdAt: true },
    }),
    db.conversation.findMany({
      where: {
        ...baseWhere,
        status: 'RESOLVED',
        resolvedAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: { resolvedAt: true },
    }),
  ])

  // Gerar buckets diários para todo o intervalo, garantindo zeros nos dias sem movimento
  const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end })

  const openedByDay = new Map<string, number>()
  const resolvedByDay = new Map<string, number>()

  for (const day of days) {
    const key = format(day, 'yyyy-MM-dd')
    openedByDay.set(key, 0)
    resolvedByDay.set(key, 0)
  }

  for (const conversation of opened) {
    const key = format(conversation.createdAt, 'yyyy-MM-dd')
    const current = openedByDay.get(key) ?? 0
    openedByDay.set(key, current + 1)
  }

  for (const conversation of resolved) {
    if (!conversation.resolvedAt) continue
    const key = format(conversation.resolvedAt, 'yyyy-MM-dd')
    const current = resolvedByDay.get(key) ?? 0
    resolvedByDay.set(key, current + 1)
  }

  return days.map((day) => {
    const key = format(day, 'yyyy-MM-dd')
    return {
      date: key,
      label: format(day, 'dd/MM', { locale: ptBR }),
      opened: openedByDay.get(key) ?? 0,
      resolved: resolvedByDay.get(key) ?? 0,
    }
  })
}

export const getConversationVolume = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: InboxDashboardFilters,
  ): Promise<ConversationVolumeByDay[]> => {
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
        fetchConversationVolume(ctx.orgId, ctx.userId, elevated, dateRange, filters),
      [
        `inbox-volume-${ctx.orgId}-${ctx.userId}-${elevated}-${startISO}-${endISO}-${filtersKey}`,
      ],
      {
        tags: [`conversations:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)

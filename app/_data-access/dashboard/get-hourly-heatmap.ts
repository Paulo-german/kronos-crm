import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { getDay, getHours } from 'date-fns'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildInboxDashboardWhere } from './build-inbox-dashboard-where'
import type { DateRange } from './types'
import type { HourlyHeatmapEntry, InboxDashboardFilters } from './inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600

async function fetchHourlyHeatmap(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: InboxDashboardFilters,
): Promise<HourlyHeatmapEntry[]> {
  const baseWhere = buildInboxDashboardWhere(orgId, userId, elevated, filters)

  // Busca mensagens recebidas (role=user) com JOIN na conversation para aplicar RBAC e filtros.
  // Extração de dayOfWeek e hour é feita no app layer via date-fns (Prisma ORM first).
  // Fallback para $queryRaw com EXTRACT(DOW/HOUR) se volume causar latência > 1s em produção.
  const messages = await db.message.findMany({
    where: {
      role: 'user',
      conversation: { ...baseWhere },
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    },
    select: { createdAt: true },
  })

  // Acumulador: key = "dayOfWeek:hour"
  const counts = new Map<string, number>()

  for (const message of messages) {
    const dayOfWeek = getDay(message.createdAt)
    const hour = getHours(message.createdAt)
    const key = `${dayOfWeek}:${hour}`
    const current = counts.get(key) ?? 0
    counts.set(key, current + 1)
  }

  const entries: HourlyHeatmapEntry[] = []

  for (const [key, count] of counts.entries()) {
    const [dayStr, hourStr] = key.split(':')
    entries.push({
      dayOfWeek: parseInt(dayStr, 10),
      hour: parseInt(hourStr, 10),
      count,
    })
  }

  return entries
}

export const getHourlyHeatmap = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: InboxDashboardFilters,
  ): Promise<HourlyHeatmapEntry[]> => {
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
        fetchHourlyHeatmap(ctx.orgId, ctx.userId, elevated, dateRange, filters),
      [
        `inbox-heatmap-${ctx.orgId}-${ctx.userId}-${elevated}-${startISO}-${endISO}-${filtersKey}`,
      ],
      {
        tags: [`conversations:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)

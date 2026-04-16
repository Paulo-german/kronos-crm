import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildInboxDashboardWhere } from './build-inbox-dashboard-where'
import type { DateRange } from './types'
import type { AttendantPerformance, InboxDashboardFilters } from './inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600

async function fetchAttendantPerformance(
  orgId: string,
  userId: string,
  dateRange: DateRange,
  filters: InboxDashboardFilters,
): Promise<AttendantPerformance[]> {
  // elevated é sempre true aqui (guard no exported function)
  const baseWhere = buildInboxDashboardWhere(orgId, userId, true, filters)

  const conversations = await db.conversation.findMany({
    where: {
      ...baseWhere,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
      assignedTo: { not: null },
    },
    select: {
      assignedTo: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      assignee: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      // Primeira mensagem de assistente para calcular TTFR por atendente no app layer
      messages: {
        where: { role: 'assistant' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  })

  // Agrupa métricas por atendente no app layer (Prisma ORM first — zero raw SQL)
  const byAttendant = new Map<
    string,
    {
      userName: string
      userAvatar: string | null
      total: number
      resolved: number
      responseTimes: number[]
    }
  >()

  for (const conversation of conversations) {
    if (!conversation.assignedTo || !conversation.assignee) continue

    const attendantId = conversation.assignedTo
    const existing = byAttendant.get(attendantId)

    const firstReply = conversation.messages[0]
    const responseTimeMs = firstReply
      ? firstReply.createdAt.getTime() - conversation.createdAt.getTime()
      : null

    if (existing) {
      existing.total += 1
      if (conversation.status === 'RESOLVED') existing.resolved += 1
      if (responseTimeMs !== null) existing.responseTimes.push(responseTimeMs)
    } else {
      byAttendant.set(attendantId, {
        userName: conversation.assignee.fullName ?? 'Sem nome',
        userAvatar: conversation.assignee.avatarUrl,
        total: 1,
        resolved: conversation.status === 'RESOLVED' ? 1 : 0,
        responseTimes: responseTimeMs !== null ? [responseTimeMs] : [],
      })
    }
  }

  const results: AttendantPerformance[] = []

  for (const [attendantUserId, data] of byAttendant.entries()) {
    const avgFirstResponseTimeMs =
      data.responseTimes.length > 0
        ? Math.round(
            data.responseTimes.reduce((sum, ms) => sum + ms, 0) / data.responseTimes.length,
          )
        : null

    results.push({
      userId: attendantUserId,
      userName: data.userName,
      userAvatar: data.userAvatar,
      conversationsHandled: data.total,
      avgFirstResponseTimeMs,
      resolutionRate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0,
    })
  }

  // Ordenar por volume de conversas atendidas (maior primeiro)
  return results.sort((a, b) => b.conversationsHandled - a.conversationsHandled)
}

export const getAttendantPerformance = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: InboxDashboardFilters,
  ): Promise<AttendantPerformance[]> => {
    const elevated = isElevated(ctx.userRole)

    // Ranking de atendentes é restrito a elevated (OWNER/ADMIN)
    if (!elevated) return []

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
        fetchAttendantPerformance(ctx.orgId, ctx.userId, dateRange, filters),
      [
        `inbox-attendant-${ctx.orgId}-${ctx.userId}-${startISO}-${endISO}-${filtersKey}`,
      ],
      {
        tags: [`conversations:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)

import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildInboxDashboardWhere } from './build-inbox-dashboard-where'
import { buildInboxFiltersKey } from './_shared/build-inbox-filters-key'
import type { DateRange } from './types'
import {
  SLA_FIRST_RESPONSE_MINUTES,
  type InboxDashboardFilters,
  type InboxKpiMetrics,
} from './inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600
const SLA_FIRST_RESPONSE_MS = SLA_FIRST_RESPONSE_MINUTES * 60 * 1000

interface FirstResponseStats {
  /** TTFR médio em ms — null se nenhuma conversa respondida no período. */
  avgMs: number | null
  /** 0-100: % das conversas respondidas cuja 1ª resposta ficou dentro do SLA. */
  withinSlaRate: number | null
}

/**
 * Calcula o TTFR (tempo até primeira resposta) das conversas no período: média
 * em ms e % dentro do SLA. Ambos derivam da mesma busca (1ª resposta por
 * conversa), evitando uma query extra. Cálculo no app layer (zero raw SQL).
 */
async function calcFirstResponseStats(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: InboxDashboardFilters,
): Promise<FirstResponseStats> {
  const baseWhere = buildInboxDashboardWhere(orgId, userId, elevated, filters)

  const conversations = await db.conversation.findMany({
    where: {
      ...baseWhere,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    },
    select: {
      createdAt: true,
      messages: {
        where: { role: 'assistant' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  })

  const responseTimes: number[] = []

  for (const conversation of conversations) {
    const firstReply = conversation.messages[0]
    if (firstReply) {
      responseTimes.push(
        firstReply.createdAt.getTime() - conversation.createdAt.getTime(),
      )
    }
  }

  if (responseTimes.length === 0) return { avgMs: null, withinSlaRate: null }

  const total = responseTimes.reduce((sum, ms) => sum + ms, 0)
  const withinSla = responseTimes.filter(
    (ms) => ms <= SLA_FIRST_RESPONSE_MS,
  ).length

  return {
    avgMs: Math.round(total / responseTimes.length),
    withinSlaRate: Math.round((withinSla / responseTimes.length) * 100),
  }
}

/**
 * Calcula o tempo médio de resolução em ms para conversas RESOLVED no período.
 */
async function calcAvgResolutionTimeMs(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: InboxDashboardFilters,
): Promise<number | null> {
  const baseWhere = buildInboxDashboardWhere(orgId, userId, elevated, filters)

  const resolved = await db.conversation.findMany({
    where: {
      ...baseWhere,
      status: 'RESOLVED',
      resolvedAt: { gte: dateRange.start, lte: dateRange.end },
    },
    select: {
      createdAt: true,
      resolvedAt: true,
    },
  })

  const resolutionTimes: number[] = []

  for (const conversation of resolved) {
    if (conversation.resolvedAt) {
      resolutionTimes.push(
        conversation.resolvedAt.getTime() - conversation.createdAt.getTime(),
      )
    }
  }

  if (resolutionTimes.length === 0) return null

  const total = resolutionTimes.reduce((sum, ms) => sum + ms, 0)
  return Math.round(total / resolutionTimes.length)
}

/**
 * Calcula a taxa de resposta (0-100): conversas com ao menos 1 mensagem de assistente / total.
 */
async function calcResponseRate(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: InboxDashboardFilters,
): Promise<number> {
  const baseWhere = buildInboxDashboardWhere(orgId, userId, elevated, filters)
  const dateFilter = { createdAt: { gte: dateRange.start, lte: dateRange.end } }

  const [total, withReply] = await Promise.all([
    db.conversation.count({ where: { ...baseWhere, ...dateFilter } }),
    db.conversation.count({
      where: {
        ...baseWhere,
        ...dateFilter,
        messages: { some: { role: 'assistant' } },
      },
    }),
  ])

  if (total === 0) return 0
  return Math.round((withReply / total) * 100)
}

async function fetchInboxKpiMetrics(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  prevRange: DateRange,
  filters: InboxDashboardFilters,
): Promise<InboxKpiMetrics> {
  const baseWhere = buildInboxDashboardWhere(orgId, userId, elevated, filters)

  const [
    openConversations,
    resolvedConversations,
    messagesReceived,
    messagesSent,
    unansweredConversations,
    prevOpenConversations,
    prevResolvedConversations,
    prevMessagesReceived,
    prevMessagesSent,
    firstResponseStats,
    avgResolutionTimeMs,
    responseRate,
    prevFirstResponseStats,
    prevAvgResolutionTimeMs,
    prevResponseRate,
  ] = await Promise.all([
    // Abertas criadas no período
    db.conversation.count({
      where: {
        ...baseWhere,
        status: 'OPEN',
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    // Resolvidas no período (usa resolvedAt como âncora temporal)
    db.conversation.count({
      where: {
        ...baseWhere,
        status: 'RESOLVED',
        resolvedAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    // Mensagens recebidas (role=user) — JOIN via conversation para RBAC e filtros
    db.message.count({
      where: {
        role: 'user',
        conversation: { ...baseWhere },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    // Mensagens enviadas (role=assistant)
    db.message.count({
      where: {
        role: 'assistant',
        conversation: { ...baseWhere },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    // Snapshot atual: não respondidas (sem filtro de período — estado atual)
    db.conversation.count({
      where: {
        ...baseWhere,
        status: 'OPEN',
        lastMessageRole: 'user',
      },
    }),
    // Período anterior
    db.conversation.count({
      where: {
        ...baseWhere,
        status: 'OPEN',
        createdAt: { gte: prevRange.start, lte: prevRange.end },
      },
    }),
    db.conversation.count({
      where: {
        ...baseWhere,
        status: 'RESOLVED',
        resolvedAt: { gte: prevRange.start, lte: prevRange.end },
      },
    }),
    db.message.count({
      where: {
        role: 'user',
        conversation: { ...baseWhere },
        createdAt: { gte: prevRange.start, lte: prevRange.end },
      },
    }),
    db.message.count({
      where: {
        role: 'assistant',
        conversation: { ...baseWhere },
        createdAt: { gte: prevRange.start, lte: prevRange.end },
      },
    }),
    // Métricas calculadas no app layer (período atual)
    calcFirstResponseStats(orgId, userId, elevated, dateRange, filters),
    calcAvgResolutionTimeMs(orgId, userId, elevated, dateRange, filters),
    calcResponseRate(orgId, userId, elevated, dateRange, filters),
    // Métricas calculadas no app layer (período anterior)
    calcFirstResponseStats(orgId, userId, elevated, prevRange, filters),
    calcAvgResolutionTimeMs(orgId, userId, elevated, prevRange, filters),
    calcResponseRate(orgId, userId, elevated, prevRange, filters),
  ])

  return {
    openConversations,
    resolvedConversations,
    avgFirstResponseTimeMs: firstResponseStats.avgMs,
    firstResponseSlaRate: firstResponseStats.withinSlaRate,
    avgResolutionTimeMs,
    responseRate,
    messagesReceived,
    messagesSent,
    unansweredConversations,
    prevOpenConversations,
    prevResolvedConversations,
    prevAvgFirstResponseTimeMs: prevFirstResponseStats.avgMs,
    prevFirstResponseSlaRate: prevFirstResponseStats.withinSlaRate,
    prevAvgResolutionTimeMs,
    prevResponseRate,
    prevMessagesReceived,
    prevMessagesSent,
  }
}

export const getInboxKpiMetrics = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    prevRange: DateRange,
    filters: InboxDashboardFilters,
  ): Promise<InboxKpiMetrics> => {
    const elevated = isElevated(ctx.userRole)
    const startISO = dateRange.start.toISOString()
    const endISO = dateRange.end.toISOString()
    const filtersKey = buildInboxFiltersKey(filters)

    const getCached = unstable_cache(
      async () =>
        fetchInboxKpiMetrics(
          ctx.orgId,
          ctx.userId,
          elevated,
          dateRange,
          prevRange,
          filters,
        ),
      [
        `inbox-kpi-${ctx.orgId}-${ctx.userId}-${elevated}-${startISO}-${endISO}-${filtersKey}`,
      ],
      {
        tags: [`conversations:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)

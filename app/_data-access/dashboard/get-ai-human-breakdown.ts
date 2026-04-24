import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildInboxDashboardWhere } from './build-inbox-dashboard-where'
import type { DateRange } from './types'
import type { AiHumanBreakdown, InboxDashboardFilters } from './inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600
const HANDOFF_TOOL_NAME = 'hand_off_to_human'

async function fetchAiHumanBreakdown(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: InboxDashboardFilters,
): Promise<AiHumanBreakdown> {
  const baseWhere = buildInboxDashboardWhere(orgId, userId, elevated, filters)
  const dateFilter = { createdAt: { gte: dateRange.start, lte: dateRange.end } }

  const [
    totalConversations,
    aiConversations,
    handoffCount,
    aiResolvedWithHandoff,
  ] = await Promise.all([
    db.conversation.count({
      where: { ...baseWhere, ...dateFilter },
    }),
    // Conversas com pelo menos 1 AgentExecution (IA envolvida)
    db.conversation.count({
      where: {
        ...baseWhere,
        ...dateFilter,
        agentExecutions: { some: {} },
      },
    }),
    // Eventos de handoff com transferência real (mode=transfer) no período.
    // Filtra por subtype=HAND_OFF_TO_HUMAN para excluir notificações pontuais (mode=notify)
    // que não pausam a IA e não representam falha do atendimento automatizado.
    // Eventos legados sem subtype não existem neste campo — o caso especial em
    // create-tool-events.ts garante que todo evento hand_off_to_human tem subtype explícito.
    db.conversationEvent.count({
      where: {
        toolName: HANDOFF_TOOL_NAME,
        conversation: { ...baseWhere },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        metadata: { path: ['subtype'], equals: 'HAND_OFF_TO_HUMAN' },
      },
    }),
    // Conversas AI que foram resolvidas COM handoff de transferência (para calcular aiSuccessRate).
    // Ignora conversas onde apenas mode=notify foi chamado — IA continuou ativa.
    db.conversation.count({
      where: {
        ...baseWhere,
        ...dateFilter,
        status: 'RESOLVED',
        agentExecutions: { some: {} },
        events: {
          some: {
            toolName: HANDOFF_TOOL_NAME,
            metadata: { path: ['subtype'], equals: 'HAND_OFF_TO_HUMAN' },
          },
        },
      },
    }),
  ])

  const humanOnlyConversations = totalConversations - aiConversations

  // aiSuccessRate: conversas AI resolvidas SEM handoff / total AI * 100
  const aiResolvedTotal = await db.conversation.count({
    where: {
      ...baseWhere,
      ...dateFilter,
      status: 'RESOLVED',
      agentExecutions: { some: {} },
    },
  })
  const aiResolvedWithoutHandoff = aiResolvedTotal - aiResolvedWithHandoff
  const aiSuccessRate =
    aiConversations > 0
      ? Math.round((aiResolvedWithoutHandoff / aiConversations) * 100)
      : 0

  return {
    aiConversations,
    humanOnlyConversations,
    handoffCount,
    aiSuccessRate,
  }
}

export const getAiHumanBreakdown = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: InboxDashboardFilters,
  ): Promise<AiHumanBreakdown> => {
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
        fetchAiHumanBreakdown(ctx.orgId, ctx.userId, elevated, dateRange, filters),
      [
        `inbox-ai-human-${ctx.orgId}-${ctx.userId}-${elevated}-${startISO}-${endISO}-${filtersKey}`,
      ],
      {
        tags: [`conversations:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)

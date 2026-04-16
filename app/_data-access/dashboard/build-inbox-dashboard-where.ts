import 'server-only'

import type { Prisma } from '@prisma/client'
import type { InboxDashboardFilters } from './inbox-dashboard-types'

/**
 * Centraliza a construção do WHERE clause para Conversation a partir dos filtros do dashboard inbox.
 * RBAC é aplicado aqui: MEMBER vê apenas conversas onde assignedTo = userId.
 */
export function buildInboxDashboardWhere(
  orgId: string,
  userId: string,
  elevated: boolean,
  filters: InboxDashboardFilters,
): Prisma.ConversationWhereInput {
  return {
    organizationId: orgId,
    // RBAC: MEMBER é restrito às suas próprias conversas; elevated pode filtrar por atendente específico
    ...(elevated && filters.assignee
      ? { assignedTo: filters.assignee }
      : elevated
        ? {}
        : { assignedTo: userId }),
    ...(filters.channel ? { channel: filters.channel } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.labelId
      ? { labels: { some: { labelId: filters.labelId } } }
      : {}),
    // Filtro IA vs humano via presença/ausência de AgentExecution associada
    ...(filters.aiVsHuman === 'ai'
      ? { agentExecutions: { some: {} } }
      : filters.aiVsHuman === 'human'
        ? { agentExecutions: { none: {} } }
        : {}),
  }
}

import 'server-only'

import { SIMULATOR_CONTACT_PHONE } from '@/_lib/simulator'
import type { DashboardFilters } from './types'

interface BuildDashboardWhereOptions {
  /** Ignora filters.status — usado por getDealsByStatus que agrupa por status e não pode filtrar por ele */
  ignoreStatus?: boolean
  /** Ignora filters.inactiveDays — usado por queries de WON/revenue onde updatedAt já é usado como dateRange */
  ignoreInactiveDays?: boolean
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Centraliza a construção do WHERE clause a partir dos filtros do dashboard.
 * Cada função de data-access chama com as options adequadas ao seu contexto para
 * evitar conflitos de campo (ex: updatedAt usado tanto para inatividade quanto para dateRange).
 */
export function buildDashboardWhere(
  orgId: string,
  userId: string,
  elevated: boolean,
  filters: DashboardFilters,
  options?: BuildDashboardWhereOptions,
) {
  return {
    organizationId: orgId,
    // Exclui deals simulados de todas as métricas do dashboard
    contacts: { none: { contact: { phone: SIMULATOR_CONTACT_PHONE } } },
    // RBAC: MEMBER é forçado a ver apenas seus próprios deals; elevated pode filtrar por assignee específico
    ...(elevated && filters.assignee
      ? { assignedTo: filters.assignee }
      : elevated
        ? {}
        : { assignedTo: userId }),
    ...(filters.pipelineId ? { stage: { pipelineId: filters.pipelineId } } : {}),
    ...(!options?.ignoreStatus && filters.status && filters.status.length > 0
      ? { status: { in: filters.status } }
      : {}),
    ...(filters.priority && filters.priority.length > 0
      ? { priority: { in: filters.priority } }
      : {}),
    ...(filters.productId
      ? { dealProducts: { some: { productId: filters.productId } } }
      : {}),
    ...(!options?.ignoreInactiveDays && filters.inactiveDays
      ? {
          updatedAt: {
            lte: new Date(Date.now() - filters.inactiveDays * MILLISECONDS_PER_DAY),
          },
        }
      : {}),
  }
}

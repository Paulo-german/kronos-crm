import type { InboxDashboardFilters } from '../inbox-dashboard-types'

/**
 * Serializa os filtros de inbox em uma string estável para compor a cache key
 * do unstable_cache nos data-access do dashboard de inbox.
 *
 * IMPORTANTE: a forma e a ordem das chaves (ch, as, la, st, ai) devem permanecer
 * byte-idênticas — qualquer mudança invalida/colide as caches existentes.
 */
export function buildInboxFiltersKey(filters: InboxDashboardFilters): string {
  return JSON.stringify({
    ch: filters.channel ?? '',
    as: filters.assignee ?? '',
    la: filters.labelId ?? '',
    st: filters.status ?? '',
    ai: filters.aiVsHuman ?? '',
  })
}

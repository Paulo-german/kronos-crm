import type { CustomerStatus, LifecycleStage } from '@prisma/client'

export interface ContactFilters {
  companyId: string | null
  isDecisionMaker: boolean | null
  hasDeals: boolean | null
  lifecycleStages: LifecycleStage[]
  customerStatuses: CustomerStatus[]
  healthScoreMin: number | null
  healthScoreMax: number | null
}

export const DEFAULT_CONTACT_FILTERS: ContactFilters = {
  companyId: null,
  isDecisionMaker: null,
  hasDeals: null,
  lifecycleStages: [],
  customerStatuses: [],
  healthScoreMin: null,
  healthScoreMax: null,
}

/** Conta quantos grupos de filtro estão ativos (reuso: hook de URL e segmentos) */
export function countActiveContactFilters(filters: ContactFilters): number {
  let count = 0
  if (filters.companyId) count++
  if (filters.isDecisionMaker !== null) count++
  if (filters.hasDeals !== null) count++
  if (filters.lifecycleStages.length > 0) count++
  if (filters.customerStatuses.length > 0) count++
  if (filters.healthScoreMin !== null || filters.healthScoreMax !== null)
    count++
  return count
}

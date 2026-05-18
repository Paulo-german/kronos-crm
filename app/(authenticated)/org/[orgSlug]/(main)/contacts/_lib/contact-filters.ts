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

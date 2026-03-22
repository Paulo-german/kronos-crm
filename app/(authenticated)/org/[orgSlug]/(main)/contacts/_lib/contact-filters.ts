export interface ContactFilters {
  /** Filtrar por empresa (UUID da Company ou null para todas) */
  companyId: string | null
  /** Filtrar decisores: true = apenas decisores, false = apenas não-decisores, null = todos */
  isDecisionMaker: boolean | null
  /** Filtrar por presença de negócios vinculados: true = com deals, false = sem deals, null = todos */
  hasDeals: boolean | null
}

export const DEFAULT_CONTACT_FILTERS: ContactFilters = {
  companyId: null,
  isDecisionMaker: null,
  hasDeals: null,
}

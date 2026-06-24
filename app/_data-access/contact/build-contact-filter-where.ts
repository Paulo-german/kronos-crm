import type { Prisma, LifecycleStage, CustomerStatus } from '@prisma/client'

/**
 * Shape de entrada dos filtros nativos de contato. Aceita tanto `null`
 * (ContactFilters, vindo da UI) quanto `undefined` (ContactListParams) para
 * "filtro ausente" — por isso as checagens usam `!= null`.
 */
export interface ContactFilterInput {
  companyId?: string | null
  isDecisionMaker?: boolean | null
  hasDeals?: boolean | null
  lifecycleStages?: LifecycleStage[]
  customerStatuses?: CustomerStatus[]
  healthScoreMin?: number | null
  healthScoreMax?: number | null
}

/**
 * Traduz os filtros nativos de contato para um `Prisma.ContactWhereInput`.
 *
 * Retorna SOMENTE a parte de filtros — não inclui `organizationId`, RBAC
 * (assignedTo) nem busca textual. Quem chama compõe essas cláusulas por cima.
 * Fonte única reusada por: listagem de contatos, contagem de segmento e
 * materialização de destinatários no disparo.
 */
export function buildContactFilterWhere(
  filters: ContactFilterInput,
): Prisma.ContactWhereInput {
  return {
    // Filtro por empresa
    ...(filters.companyId ? { companyId: filters.companyId } : {}),
    // Filtro de decisor (false é valor válido — por isso != null)
    ...(filters.isDecisionMaker != null
      ? { isDecisionMaker: filters.isDecisionMaker }
      : {}),
    // Filtro por presença de negócios vinculados
    ...(filters.hasDeals != null
      ? filters.hasDeals
        ? { deals: { some: {} } }
        : { deals: { none: {} } }
      : {}),
    // Filtros de lifecycle stage (multi-select)
    ...(filters.lifecycleStages?.length
      ? { lifecycleStage: { in: filters.lifecycleStages } }
      : {}),
    // Filtros de customer status (multi-select)
    ...(filters.customerStatuses?.length
      ? { customerStatus: { in: filters.customerStatuses } }
      : {}),
    // Filtro de health score range
    ...(filters.healthScoreMin != null || filters.healthScoreMax != null
      ? {
          healthScore: {
            ...(filters.healthScoreMin != null
              ? { gte: filters.healthScoreMin }
              : {}),
            ...(filters.healthScoreMax != null
              ? { lte: filters.healthScoreMax }
              : {}),
            not: null,
          },
        }
      : {}),
  }
}

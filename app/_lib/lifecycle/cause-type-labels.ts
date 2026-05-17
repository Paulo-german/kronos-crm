import { LifecycleCauseType } from '@prisma/client'

/**
 * Converte `LifecycleCauseType` em rótulo PT-BR exibido na timeline de Movimento Recente.
 *
 * Quando `causeType=MANUAL` e o nome do usuário responsável estiver disponível,
 * o rótulo inclui a autoria ("manualmente por {nome}"). Fallback para "manualmente"
 * preserva legibilidade caso o usuário tenha sido removido (`changedByName=null`).
 *
 * `BACKFILL` aparece aqui apenas como salvaguarda — a query principal filtra essa
 * causa antes de chegar à UI (origem sintética da migração de dados).
 */
export function mapCauseTypeToLabel(
  causeType: LifecycleCauseType,
  changedByName?: string | null,
): string {
  switch (causeType) {
    case LifecycleCauseType.AI_QUALIFICATION:
      return 'qualificado pela IA'
    case LifecycleCauseType.AGENT_STEP_ADVANCED:
      return 'via Agente IA'
    case LifecycleCauseType.DEAL_CREATED:
      return 'deal criado'
    case LifecycleCauseType.DEAL_WON:
      return 'deal ganho'
    case LifecycleCauseType.DEAL_LOST:
      return 'deal perdido'
    case LifecycleCauseType.DEAL_REOPENED:
      return 'deal reaberto'
    case LifecycleCauseType.MANUAL:
      return changedByName ? `manualmente por ${changedByName}` : 'manualmente'
    case LifecycleCauseType.INACTIVITY:
      return 'por inatividade'
    case LifecycleCauseType.BACKFILL:
      return 'migração de dados'
  }
}

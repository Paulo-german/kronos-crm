import type { ImportAgentInput } from './schema'

interface SanitizeOptions {
  isSuperAdmin: boolean
}

interface SanitizeResult {
  sanitized: ImportAgentInput
  warnings: string[]
}

/**
 * Função pura: remove/zera campos não-portáveis entre orgs e aplica o gate de
 * single-v2. Retorna uma cópia sanitizada + warnings para a UI exibir ao usuário.
 * Não toca no banco — apenas transforma o payload validado.
 */
export const sanitizeImport = (
  input: ImportAgentInput,
  { isSuperAdmin }: SanitizeOptions,
): SanitizeResult => {
  const warnings: string[] = []
  const agent = input.agent

  // single-v2 só é criável por superadmin (mesmo gate do createAgent).
  // Rebaixa para single-v1 ao invés de bloquear, para não travar templates.
  const agentVersion =
    agent.agentVersion === 'single-v2' && !isSuperAdmin
      ? 'single-v1'
      : agent.agentVersion
  if (agentVersion !== agent.agentVersion) {
    warnings.push(
      'Versão single-v2 indisponível nesta conta — agente importado como single-v1.',
    )
  }

  let removedMoveDeal = false
  let zeroedDealFks = false
  const steps = agent.steps.map((step) => {
    const filteredActions =
      step.actions?.filter((action) => {
        if (action.type === 'move_deal') {
          removedMoveDeal = true
          return false
        }
        return true
      }) ?? null

    if (step.lifecycleDealPipelineId !== null || step.autoDealStageId !== null) {
      zeroedDealFks = true
    }

    return {
      ...step,
      actions: filteredActions,
      // FKs de pipeline/stage não existem na org de destino.
      lifecycleDealPipelineId: null,
      autoDealStageId: null,
    }
  })

  if (removedMoveDeal) {
    warnings.push(
      'Ações de movimentação de funil (mover negócio) foram removidas — reconfigure os estágios na org de destino.',
    )
  }
  if (zeroedDealFks) {
    warnings.push(
      'Referências de funil/estágio em etapas (criação automática de negócio) foram zeradas — reconfigure manualmente.',
    )
  }

  // followUpExhaustedConfig.targetStageId aponta para stage de outra org.
  let followUpExhaustedAction = agent.followUpExhaustedAction
  let exhaustedConfig = agent.followUpExhaustedConfig
    ? { ...agent.followUpExhaustedConfig, targetStageId: undefined }
    : agent.followUpExhaustedConfig
  if (followUpExhaustedAction === 'MOVE_DEAL_STAGE') {
    followUpExhaustedAction = 'NONE'
    // Sem ação de mover estágio, a config inteira deixa de fazer sentido.
    exhaustedConfig = null
    warnings.push(
      'Ação de follow-up "mover estágio do negócio" foi desativada — reconfigure o estágio de destino.',
    )
  }

  const sanitized: ImportAgentInput = {
    ...input,
    agent: {
      ...agent,
      agentVersion,
      steps,
      followUpExhaustedAction,
      followUpExhaustedConfig: exhaustedConfig,
    },
  }

  return { sanitized, warnings }
}

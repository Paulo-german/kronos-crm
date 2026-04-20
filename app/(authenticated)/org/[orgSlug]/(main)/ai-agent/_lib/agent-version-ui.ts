export interface AgentVersionFormState {
  agentType: 'single' | 'crew'
  singleVersion: 'single-v1' | 'single-v2'
}

/**
 * Compõe o valor canônico de `agentVersion` a partir do estado visual do form.
 * Crew não tem versão granular hoje — sempre mapeia para 'crew-v1'.
 */
export function composeAgentVersion(
  state: AgentVersionFormState,
): 'single-v1' | 'single-v2' | 'crew-v1' {
  if (state.agentType === 'crew') return 'crew-v1'
  return state.singleVersion
}

/**
 * Decompõe o valor canônico de `agentVersion` em estado visual para os controles do form.
 * Garante fallback seguro para `undefined` (novo agente).
 */
export function decomposeAgentVersion(
  value: 'single-v1' | 'single-v2' | 'crew-v1' | undefined,
): AgentVersionFormState {
  if (value === 'crew-v1') {
    return { agentType: 'crew', singleVersion: 'single-v1' }
  }

  return {
    agentType: 'single',
    singleVersion: value === 'single-v2' ? 'single-v2' : 'single-v1',
  }
}

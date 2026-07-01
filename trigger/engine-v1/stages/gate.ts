import { logger } from '@trigger.dev/sdk/v3'
import { decideGate } from '../gate/decide-gate'
import { loadStepRequirements } from '../gate/load-requirements'
import { parseSessionState } from '../ledger/schema'
import type { Stage } from '../types'

// O GATE (Forma 1): decisão DETERMINÍSTICA de avanço de etapa — roda depois do extract (que
// deixou o ledger fresco) e antes do generate. Lê o contrato (required por etapa) + o ledger
// e decide onde o turno opera: HOLD na etapa (cobra o que falta) ou AVANÇA. Sem LLM.
// O resultado alimenta o qualificationBlock (generate cobra) e a gravação (persist grava
// currentStepOrder + reinicia currentStepEnteredAtTurn no avanço).
export const gate: Stage = async ({ ctx, session, sessionState }) => {
  if (!session) return {}

  const requirements = await loadStepRequirements(ctx.effectiveAgentId)
  if (requirements.length === 0) return {} // agente sem etapas → sem funil, sem gate

  // Fallback pro ledger do banco caso o extract tenha sido no-op (agente sem campos AGENT).
  const ledger = sessionState ?? parseSessionState(session.state)
  const decision = decideGate(requirements, ledger.attributes, {
    currentStepId: session.currentStepId,
    turnCount: session.turnCount,
    stepEnteredAtTurn: session.currentStepEnteredAtTurn,
  })

  logger.info('[engine-v1 gate]', {
    conversationId: ctx.conversationId,
    from: session.currentStepId,
    to: decision.nextStepId,
    advanced: decision.advanced,
    pendingRequired: decision.pendingRequired,
  })

  return { gate: decision }
}

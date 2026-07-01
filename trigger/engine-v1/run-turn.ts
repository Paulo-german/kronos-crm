import type { DispatcherCtx } from '../dispatcher-types'
import { extract } from './stages/extract'
import { generate } from './stages/generate'
import { guard } from './stages/guard'
import { load } from './stages/load'
import { persist } from './stages/persist'
import { send } from './stages/send'
import type { AgentTurnState, Stage, TurnResult } from './types'

// Ordem fixa do turno. persist (reconcilia créditos + turnCount) roda ANTES do send:
// assim créditos e estado ficam consistentes mesmo se o envio falhar (o send aborta
// sem retry). extract/gate/retrieve entram entre `load` e `generate` nas Fases 1a/1b.
const STAGES: ReadonlyArray<{ name: string; run: Stage }> = [
  { name: 'load', run: load },
  { name: 'extract', run: extract }, // Fase 1a: popula o ledger (telemetria, não trava)
  { name: 'generate', run: generate },
  { name: 'guard', run: guard },
  { name: 'persist', run: persist },
  { name: 'send', run: send },
]

// Roda o turno como um pipe de estágios tipados. Cada estágio devolve um patch
// mesclado no estado; se algum setar `outcome`, o turno encerra cedo (short-circuit).
export async function runEngineV1(ctx: DispatcherCtx): Promise<TurnResult> {
  let state: AgentTurnState = { ctx }

  for (const stage of STAGES) {
    const patch = await stage.run(state)
    state = { ...state, ...patch }
    if (state.outcome) break // skip/transfer → não roda os estágios seguintes
  }

  return finalize(state)
}

// Ritual de encerramento comum a TODOS os caminhos (sucesso e skip) — concentra o
// que a v2 repetia em cada early-return.
// TODO(Pedaço 2 — finalize): tracker.complete + emitAgentStatus(idle,
// terminalReason derivado do outcome) + finalizeTrace.
async function finalize(state: AgentTurnState): Promise<TurnResult> {
  const outcome = state.outcome ?? { type: 'success' as const }
  if (outcome.type === 'skipped')
    return { skipped: true, reason: outcome.reason }
  return { success: true } // success | transferred
}

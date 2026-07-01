import type { AgentSession } from '@prisma/client'
import type { ModelMessage, ToolSet } from 'ai'
import type { DispatcherCtx } from '../dispatcher-types'
import type { ToolContext } from '../tools/types'
import type { GateDecision } from './gate/decide-gate'
import type { AgentSessionState } from './ledger/schema'
import type { CompiledPrompt } from './prompt/compile-prompt'
import type { EngineStep } from './prompt/context'

// Resultado terminal do turno — o que a task devolve (compatível com v1/v2).
export type TurnResult = { success: true } | { skipped: true; reason: string }

// Sinal interno de short-circuit: um estágio seta isto pra encerrar o turno cedo
// (sem exceção de controle). O runner lê após cada estágio e para se presente.
export type TurnOutcome =
  | { type: 'success' }
  | { type: 'skipped'; reason: string }
  | { type: 'transferred' } // multi-agent — fora do escopo da 1.0

// Tokens reais consumidos pelo LLM (soma das 2 chamadas do generate) — usado na
// reconciliação de créditos e no metadata da mensagem.
export interface LlmUsage {
  inputTokens: number | null
  outputTokens: number | null
}

// Estado que atravessa o pipe. Cresce conforme cada estágio é implementado;
// campos opcionais = produzidos por um estágio e consumidos pelos seguintes.
export interface AgentTurnState {
  readonly ctx: DispatcherCtx

  // --- load: prepara tudo que o generate consome ---
  session?: AgentSession // ledger da conversa (fonte do currentStepOrder)
  modelId?: string // modelo do agente (o generate usa pra getModel)
  prompt?: CompiledPrompt // systemPrompt (Call 2, com persona) + systemPromptForCall1 (Call 1, sem)
  messages?: ModelMessage[] // histórico + nova mensagem, no formato do modelo
  tools?: ToolSet // ferramentas de LEITURA + handoff (buildToolSet)
  toolContext?: ToolContext // contexto que as tools recebem (org/agent/conversation/deal…)
  knowledgeBlock?: string | null // KB pré-buscada (prefetch) pro redator — reforço além da tool
  estimatedCost?: number // custo do débito otimista (load) — pro persist reconciliar
  steps?: EngineStep[] // etapas do funil (do profile) — o gate acha a atual pra montar o foco

  // --- extract (1a): popula o ledger ---
  sessionState?: AgentSessionState // ledger atualizado (attributes/control) — o persist grava

  // --- gate (1b): decisão determinística de avanço de etapa ---
  gate?: GateDecision // nextStepId + pendingRequired + advanced — generate cobra, persist grava
  qualificationBlock?: string | null // instrução de FOCO do turno pro redator (Call 2)

  // --- generate: produz a resposta ---
  responseText?: string // texto final, limpo (pós stripLeakedToolCalls), pronto pro send
  usage?: LlmUsage // tokens reais (Call 1 + Call 2) — pro settleCredits + metadata
  handedOff?: boolean // hand_off_to_human em 'transfer' — envia a despedida mesmo se aiPaused
  llmDurationMs?: number // duração das 2 chamadas — metadata da mensagem

  // --- controle ---
  outcome?: TurnOutcome // setado por qualquer estágio pra short-circuit
}

// Um estágio recebe o estado corrente e devolve um patch a ser mesclado.
// Imports diretos (db, helpers) como o resto do projeto; testes rodam contra o
// banco de teste dedicado (sem injeção de dependência).
export type Stage = (state: AgentTurnState) => Promise<Partial<AgentTurnState>>

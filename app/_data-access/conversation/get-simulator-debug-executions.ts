import 'server-only'

import { db } from '@/_lib/prisma'
import { redactPiiInText, redactJson } from '@/_lib/pii-mask'
import type {
  AgentExecutionStatus,
  AgentExecutionStepType,
  AgentExecutionStepStatus,
} from '@prisma/client'

// Simulações são curtas; trazemos as execuções recentes inteiras com seus steps.
const DEBUG_EXECUTIONS_LIMIT = 50

export interface SimulatorDebugStep {
  order: number
  type: AgentExecutionStepType
  status: AgentExecutionStepStatus
  toolName: string | null
  durationMs: number | null
  // Args e resultado da tool, com PII redigida (preservando estrutura para render).
  input: unknown
  output: unknown
}

export interface SimulatorDebugExecution {
  id: string
  status: AgentExecutionStatus
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  inputTokens: number | null
  outputTokens: number | null
  creditsCost: number | null
  finishReason: string | null
  errorMessage: string | null
  // System prompt compilado do turno (só em simulação; null em execuções antigas/produção).
  systemPrompt: string | null
  steps: SimulatorDebugStep[]
}

// Extrai SÓ o systemPrompt do metadata (whitelist) — nunca dump cru do Json.
function extractSystemPrompt(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const value = (metadata as Record<string, unknown>).systemPrompt
  return typeof value === 'string' ? redactPiiInText(value) : null
}

/**
 * Execuções do agente (uma por turno) de uma conversa simulada, com métricas reais:
 * duração, modelo, tokens, créditos, finishReason/erro e a quebra por step.
 * Mais recentes primeiro — o turno atual fica no topo. Exclusivo do simulador.
 */
export async function getSimulatorDebugExecutions(
  conversationId: string,
): Promise<SimulatorDebugExecution[]> {
  const executions = await db.agentExecution.findMany({
    where: { conversationId },
    orderBy: { startedAt: 'desc' },
    take: DEBUG_EXECUTIONS_LIMIT,
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      durationMs: true,
      inputTokens: true,
      outputTokens: true,
      creditsCost: true,
      finishReason: true,
      errorMessage: true,
      metadata: true,
      steps: {
        orderBy: { order: 'asc' },
        select: {
          order: true,
          type: true,
          status: true,
          toolName: true,
          durationMs: true,
          input: true,
          output: true,
        },
      },
    },
  })

  return executions.map((execution) => ({
    id: execution.id,
    status: execution.status,
    startedAt: execution.startedAt.toISOString(),
    completedAt: execution.completedAt?.toISOString() ?? null,
    durationMs: execution.durationMs,
    inputTokens: execution.inputTokens,
    outputTokens: execution.outputTokens,
    creditsCost: execution.creditsCost,
    finishReason: execution.finishReason,
    // errorMessage pode carregar PII/detalhes internos — redige antes de ir ao client.
    errorMessage: redactPiiInText(execution.errorMessage),
    systemPrompt: extractSystemPrompt(execution.metadata),
    steps: execution.steps.map((step) => ({
      ...step,
      // input/output são dados de teste (SIMULATOR), mas redigimos PII por segurança.
      input: redactJson(step.input),
      output: redactJson(step.output),
    })),
  }))
}

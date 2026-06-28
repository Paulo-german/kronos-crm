import 'server-only'

import { db } from '@/_lib/prisma'
import { redactPiiInText } from '@/_lib/pii-mask'
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
  steps: SimulatorDebugStep[]
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
      steps: {
        orderBy: { order: 'asc' },
        select: {
          order: true,
          type: true,
          status: true,
          toolName: true,
          durationMs: true,
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
    steps: execution.steps,
  }))
}

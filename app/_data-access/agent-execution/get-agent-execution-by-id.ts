import 'server-only'
import { cache } from 'react'
import { db } from '@/_lib/prisma'
import type {
  AgentExecutionStatus,
  AgentExecutionStepType,
  AgentExecutionStepStatus,
} from '@prisma/client'
import type { AgentExecutionDto } from './get-agent-executions'

export interface AgentExecutionStepDto {
  id: string
  order: number
  type: AgentExecutionStepType
  status: AgentExecutionStepStatus
  toolName: string | null
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  durationMs: number | null
  createdAt: Date
}

export interface AgentExecutionDetailDto extends AgentExecutionDto {
  steps: AgentExecutionStepDto[]
}

const fetchExecutionDetailFromDb = async (
  executionId: string,
  orgId: string,
): Promise<AgentExecutionDetailDto | null> => {
  const execution = await db.agentExecution.findFirst({
    where: { id: executionId, organizationId: orgId },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
      _count: {
        select: { steps: true },
      },
      conversation: {
        select: {
          contact: {
            select: { name: true },
          },
        },
      },
    },
  })

  if (!execution) return null

  return {
    id: execution.id,
    status: execution.status as AgentExecutionStatus,
    startedAt: execution.startedAt,
    completedAt: execution.completedAt,
    durationMs: execution.durationMs,
    modelId: execution.modelId,
    inputTokens: execution.inputTokens,
    outputTokens: execution.outputTokens,
    creditsCost: execution.creditsCost,
    errorMessage: execution.errorMessage,
    finishReason: execution.finishReason,
    conversationId: execution.conversationId,
    contactName: execution.conversation?.contact?.name ?? null,
    stepsCount: execution._count.steps,
    createdAt: execution.createdAt,
    steps: execution.steps.map((step) => ({
      id: step.id,
      order: step.order,
      type: step.type as AgentExecutionStepType,
      status: step.status as AgentExecutionStepStatus,
      toolName: step.toolName,
      input: step.input as Record<string, unknown> | null,
      output: step.output as Record<string, unknown> | null,
      durationMs: step.durationMs,
      createdAt: step.createdAt,
    })),
  }
}

// Sem unstable_cache — apenas dedup React por request
export const getAgentExecutionById = cache(
  async (
    executionId: string,
    orgId: string,
  ): Promise<AgentExecutionDetailDto | null> => {
    return fetchExecutionDetailFromDb(executionId, orgId)
  },
)

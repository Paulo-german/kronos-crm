import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { Prisma } from '@prisma/client'
import type {
  AgentExecutionStepType,
  AgentExecutionStepStatus,
} from '@prisma/client'

// ---------------------------------------------------------------------------
// Tipos internos do tracker
// ---------------------------------------------------------------------------

interface ExecutionTrackerParams {
  agentId: string
  organizationId: string
  conversationId: string
  triggerMessageId: string
}

interface TrackedStep {
  type: AgentExecutionStepType
  status: AgentExecutionStepStatus
  toolName?: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  durationMs?: number
}

interface CompleteParams {
  modelId: string
  inputTokens: number
  outputTokens: number
  creditsCost: number
}

// ---------------------------------------------------------------------------
// ExecutionTracker — acumula steps em memória, persiste em batch no final
// ---------------------------------------------------------------------------

export interface ExecutionTracker {
  addStep(step: TrackedStep): void
  complete(params: CompleteParams): Promise<void>
  skip(reason: string): Promise<void>
}

export function createExecutionTracker(
  params: ExecutionTrackerParams,
): ExecutionTracker {
  const { agentId, organizationId, conversationId, triggerMessageId } = params

  // UUID gerado antecipadamente para usar no executionId dos steps
  const executionId = crypto.randomUUID()
  const startedAt = new Date()
  const steps: TrackedStep[] = []

  // Acumula step em memória — operação 100% síncrona, zero I/O
  function addStep(step: TrackedStep): void {
    steps.push(step)
  }

  function buildStepRows(
    execId: string,
  ): Prisma.AgentExecutionStepCreateManyInput[] {
    return steps.map((step, index) => ({
      executionId: execId,
      order: index + 1,
      type: step.type,
      status: step.status,
      toolName: step.toolName ?? null,
      // Campos JSON nullable: usar Prisma.DbNull para representar null explícito
      input: step.input != null
        ? (step.input as Prisma.InputJsonValue)
        : Prisma.DbNull,
      output: step.output != null
        ? (step.output as Prisma.InputJsonValue)
        : Prisma.DbNull,
      durationMs: step.durationMs ?? null,
    }))
  }

  async function complete(completeParams: CompleteParams): Promise<void> {
    const completedAt = new Date()
    const durationMs = completedAt.getTime() - startedAt.getTime()

    try {
      await db.$transaction([
        db.agentExecution.create({
          data: {
            id: executionId,
            agentId,
            organizationId,
            conversationId,
            triggerMessageId,
            status: 'COMPLETED',
            startedAt,
            completedAt,
            durationMs,
            modelId: completeParams.modelId,
            inputTokens: completeParams.inputTokens,
            outputTokens: completeParams.outputTokens,
            creditsCost: completeParams.creditsCost,
          },
        }),
        db.agentExecutionStep.createMany({
          data: buildStepRows(executionId),
        }),
      ])
    } catch (error) {
      logger.warn(
        'Failed to persist execution (COMPLETED) — tracking non-fatal',
        {
          executionId,
          agentId,
          conversationId,
          error: error instanceof Error ? error.message : String(error),
        },
      )
    }
  }

  async function skip(reason: string): Promise<void> {
    const completedAt = new Date()
    const durationMs = completedAt.getTime() - startedAt.getTime()

    try {
      await db.$transaction([
        db.agentExecution.create({
          data: {
            id: executionId,
            agentId,
            organizationId,
            conversationId,
            triggerMessageId,
            status: 'SKIPPED',
            startedAt,
            completedAt,
            durationMs,
            errorMessage: reason,
          },
        }),
        db.agentExecutionStep.createMany({
          data: buildStepRows(executionId),
        }),
      ])
    } catch (error) {
      logger.warn(
        'Failed to persist execution (SKIPPED) — tracking non-fatal',
        {
          executionId,
          agentId,
          conversationId,
          reason,
          error: error instanceof Error ? error.message : String(error),
        },
      )
    }
  }

  return { addStep, complete, skip }
}

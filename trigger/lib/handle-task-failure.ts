import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { createConversationEvent } from './create-conversation-event'
import { revalidateConversationCache } from './revalidate-cache'
import type { ProcessingErrorSubtype } from '@/_lib/conversation-events/types'
import type { ProcessAgentMessagePayload } from './build-dispatcher-ctx'

// Handler compartilhado pelas tasks v1/v2/v3 — cada uma registra via
// `task({ onFailure })` passando seu próprio label para logs.
export async function handleAgentTaskFailure(
  pipelineLabel: string,
  { payload, error }: { payload: ProcessAgentMessagePayload; error: unknown },
): Promise<void> {
  const { conversationId, organizationId, agentId, message, groupId } = payload
  const failureAgentId = agentId || null
  const failureGroupId = groupId ?? null
  const errorMessage = error instanceof Error ? error.message : String(error)

  logger.error(`${pipelineLabel} failed after all retries`, {
    conversationId,
    messageId: message.messageId,
    organizationId,
    agentId: failureAgentId,
    error: errorMessage,
  })

  try {
    await db.agentExecution.create({
      data: {
        id: crypto.randomUUID(),
        agentId: failureAgentId,
        agentGroupId: failureGroupId,
        organizationId,
        conversationId,
        triggerMessageId: message.messageId,
        status: 'FAILED',
        startedAt: new Date(),
        completedAt: new Date(),
        errorMessage,
      },
    })
  } catch (persistError) {
    logger.warn('Failed to persist failed execution', { persistError })
  }

  await createConversationEvent({
    conversationId,
    type: 'PROCESSING_ERROR',
    content: 'Erro ao processar mensagem com IA.',
    metadata: {
      subtype: 'LLM_ERROR' satisfies ProcessingErrorSubtype,
      error: errorMessage,
    },
  })
  await revalidateConversationCache(conversationId, organizationId)
}

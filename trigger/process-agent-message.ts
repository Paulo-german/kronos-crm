import { task, tasks, logger } from '@trigger.dev/sdk/v3'
import { resolveCanonicalAgentVersion } from '../app/_lib/agent/agent-version'
import { db } from '@/_lib/prisma'
import { routeConversation } from './lib/route-conversation'
import { createConversationEvent } from './lib/create-conversation-event'
import type {
  InfoSubtype,
  ProcessingErrorSubtype,
} from '@/_lib/conversation-events/types'
import { revalidateConversationCache } from './lib/revalidate-cache'
import type { ProcessAgentMessagePayload } from './lib/build-dispatcher-ctx'
import { handleAgentTaskFailure } from './lib/handle-task-failure'

// Re-exportar o tipo para compatibilidade retroativa com callers que importam daqui
export type { ProcessAgentMessagePayload }

// Helper — registra execução mínima para early exits do router-lite
async function createMinimalExecution(params: {
  agentId: string | null
  agentGroupId?: string | null
  organizationId: string
  conversationId: string
  triggerMessageId: string
  reason: string
  errorMessage?: string
}): Promise<void> {
  try {
    const now = new Date()
    await db.agentExecution.create({
      data: {
        id: crypto.randomUUID(),
        agentId: params.agentId,
        agentGroupId: params.agentGroupId ?? null,
        organizationId: params.organizationId,
        conversationId: params.conversationId,
        triggerMessageId: params.triggerMessageId,
        status: 'SKIPPED',
        startedAt: now,
        completedAt: now,
        durationMs: 0,
        errorMessage: params.errorMessage ?? params.reason,
      },
    })
  } catch (error) {
    logger.warn('Failed to persist minimal execution', {
      reason: params.reason,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// ---------------------------------------------------------------------------
// Router leve — descobre agentVersion e dispatcha para a task v{N} correta.
// Mantém id 'process-agent-message' para backward compat com todos os callers.
// ---------------------------------------------------------------------------

export const processAgentMessage = task({
  id: 'process-agent-message',
  retry: { maxAttempts: 3 },
  run: async (payload: ProcessAgentMessagePayload) => {
    const {
      agentId,
      conversationId,
      organizationId,
      requiresRouting,
      groupId,
      message,
    } = payload

    const logCtx = { conversationId, agentId, msgId: message.messageId }

    let effectiveAgentId = agentId

    // -----------------------------------------------------------------------
    // Routing — apenas quando requiresRouting=true e ainda não resolvido
    // -----------------------------------------------------------------------
    if (requiresRouting && groupId) {
      logger.info('[router] routing conversation', { ...logCtx, groupId })

      const routerMessageHistory = await db.message.findMany({
        where: { conversationId, isArchived: false },
        orderBy: { createdAt: 'asc' },
        take: 50,
        select: { role: true, content: true },
      })

      let routerResult: Awaited<ReturnType<typeof routeConversation>>

      try {
        routerResult = await routeConversation({
          groupId,
          conversationId,
          organizationId,
          messageHistory: routerMessageHistory,
        })
      } catch (routerError) {
        const errorMessage =
          routerError instanceof Error ? routerError.message : String(routerError)
        const isNoCredits = errorMessage === 'NO_CREDITS'

        logger.warn('[router] routing failed', { ...logCtx, error: errorMessage })

        await createMinimalExecution({
          agentId: null,
          agentGroupId: groupId,
          organizationId,
          conversationId,
          triggerMessageId: message.messageId,
          reason: isNoCredits ? 'router_no_credits' : 'router_failed',
          errorMessage,
        })

        if (!isNoCredits) {
          await createConversationEvent({
            conversationId,
            type: 'PROCESSING_ERROR',
            content: 'Falha ao classificar a conversa pelo agente roteador.',
            metadata: {
              subtype: 'ROUTER_FAILED' satisfies ProcessingErrorSubtype,
              error: errorMessage,
            },
          })
          await revalidateConversationCache(conversationId, organizationId)
        }

        return { skipped: true, reason: 'router_failed' }
      }

      if (!routerResult) {
        logger.warn('[router] no suitable worker', logCtx)
        await createMinimalExecution({
          agentId: null,
          agentGroupId: groupId,
          organizationId,
          conversationId,
          triggerMessageId: message.messageId,
          reason: 'no_suitable_worker',
        })
        return { skipped: true, reason: 'no_suitable_worker' }
      }

      effectiveAgentId = routerResult.targetAgentId

      // Persistir worker ativo para próximas mensagens
      await db.conversation.update({
        where: { id: conversationId },
        data: { activeAgentId: effectiveAgentId },
      })

      await createConversationEvent({
        conversationId,
        type: 'INFO',
        content: `Agente "${routerResult.workerName}" atribuído à conversa`,
        metadata: {
          subtype: 'ROUTER_ASSIGNED' satisfies InfoSubtype,
          targetAgentId: routerResult.targetAgentId,
          confidence: routerResult.confidence,
          reasoning: routerResult.reasoning,
        },
      })

      logger.info('[router] worker resolved', {
        ...logCtx,
        effectiveAgentId,
        workerName: routerResult.workerName,
      })
    }

    // -----------------------------------------------------------------------
    // Lookup de agentVersion — 1 campo, ~1ms
    // -----------------------------------------------------------------------
    const { agentVersion } = await db.agent.findUniqueOrThrow({
      where: { id: effectiveAgentId },
      select: { agentVersion: true },
    })

    const version = resolveCanonicalAgentVersion(agentVersion)
    const targetTaskId = `process-agent-message-${version}` as const

    logger.info('[router] dispatching to versioned task', {
      ...logCtx,
      effectiveAgentId,
      version,
      targetTaskId,
    })

    // Propagar payload com routing já resolvido para evitar routing duplo na task filha
    await tasks.trigger(targetTaskId, {
      ...payload,
      agentId: effectiveAgentId,
      requiresRouting: false,
      skipRouting: true,
    })

    return { dispatched: true, version }
  },
  onFailure: async ({ payload, error }) =>
    handleAgentTaskFailure('process-agent-message (router)', { payload, error }),
})

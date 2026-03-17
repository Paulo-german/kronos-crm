import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'
import type { ConversationEventType } from '@/_lib/conversation-events/types'
import { TOOL_SUBTYPE_MAP, ALWAYS_SUCCESS_TOOLS } from '@/_lib/conversation-events/types'
import type { ToolSuccessSubtype } from '@/_lib/conversation-events/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateEventParams {
  conversationId: string
  type: ConversationEventType
  toolName?: string
  content: string
  metadata?: Record<string, unknown>
  visibleToUser?: boolean
}

// ---------------------------------------------------------------------------
// Create a single conversation event (never blocks the main flow)
// ---------------------------------------------------------------------------

export async function createConversationEvent(params: CreateEventParams): Promise<void> {
  try {
    await db.conversationEvent.create({
      data: {
        conversationId: params.conversationId,
        type: params.type,
        toolName: params.toolName,
        content: params.content,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        visibleToUser: params.visibleToUser ?? true,
      },
    })
  } catch (error) {
    logger.warn('Failed to create conversation event', { error, ...params })
  }
}

// ---------------------------------------------------------------------------
// Create tool events from AI SDK steps (batch)
// ---------------------------------------------------------------------------

interface AiSdkStep {
  toolCalls?: Array<{ toolName: string; input: unknown }>
  toolResults?: Array<{ toolName: string; output: unknown }>
}

export async function createToolEvents(
  conversationId: string,
  steps: AiSdkStep[],
): Promise<void> {
  try {
    const events: Array<Prisma.ConversationEventCreateManyInput> = []

    for (const step of steps) {
      if (!step.toolCalls?.length) continue

      for (const toolCall of step.toolCalls) {
        const toolInput = toolCall.input as Record<string, unknown>

        // Find matching tool result
        const toolResult = step.toolResults?.find(
          (result) => result.toolName === toolCall.toolName,
        )
        if (!toolResult) continue

        const output = toolResult.output as { success?: boolean; message?: string } | undefined
        const isSuccess = output?.success === true
        const content = output?.message ?? (isSuccess ? 'Operação concluída' : 'Operação falhou')

        // Tools que sempre resultam em success (hand_off_to_human, search_knowledge)
        const alwaysSuccessSubtype = ALWAYS_SUCCESS_TOOLS[toolCall.toolName]
        if (alwaysSuccessSubtype) {
          events.push({
            conversationId,
            type: 'TOOL_SUCCESS',
            toolName: toolCall.toolName,
            content,
            metadata: { subtype: alwaysSuccessSubtype, input: toolInput } as Prisma.InputJsonValue,
            visibleToUser: toolCall.toolName !== 'search_knowledge' && toolCall.toolName !== 'list_availability',
          })
          continue
        }

        // Tools com mapeamento success/failure
        const mapping = TOOL_SUBTYPE_MAP[toolCall.toolName]
        if (!mapping) continue

        const type: ConversationEventType = isSuccess ? 'TOOL_SUCCESS' : 'TOOL_FAILURE'

        // Caso especial: update_deal com mudança de status
        let subtype: string = isSuccess ? mapping.success : mapping.failure
        if (toolCall.toolName === 'update_deal' && isSuccess) {
          if (toolInput.status === 'WON') {
            subtype = 'DEAL_WON' satisfies ToolSuccessSubtype
          } else if (toolInput.status === 'LOST') {
            subtype = 'DEAL_LOST' satisfies ToolSuccessSubtype
          }
        }

        events.push({
          conversationId,
          type,
          toolName: toolCall.toolName,
          content,
          metadata: { subtype, input: toolInput } as Prisma.InputJsonValue,
          visibleToUser: true,
        })
      }
    }

    if (events.length > 0) {
      await db.conversationEvent.createMany({ data: events })
    }
  } catch (error) {
    logger.warn('Failed to create tool events', { error, conversationId })
  }
}

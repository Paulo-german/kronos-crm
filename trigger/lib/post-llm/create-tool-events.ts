import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'
import { TOOL_SUBTYPE_MAP, ALWAYS_SUCCESS_TOOLS } from '@/_lib/conversation-events/types'
import type { ConversationEventType, ToolSuccessSubtype } from '@/_lib/conversation-events/types'
import type { ToolAgentTrace } from '../two-phase-types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateToolEventsCtx {
  conversationId: string
  steps: ToolAgentTrace['toolCalls']
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Para cada toolCall do Agent 1, cria o ConversationEvent correspondente na
 * timeline — alimenta a visualização do operador no inbox.
 *
 * Agrupa passos I (conversation events) + J (tool events) porque na prática
 * o v1 os cria no mesmo loop sobre toolCalls.
 *
 * Usa createMany em batch para minimizar round-trips ao banco.
 *
 * Erro: try/catch + log — telemetria NÃO deve derrubar o envio da mensagem.
 * Timeline incompleta é aceitável vs. bloquear o fluxo principal.
 *
 * Diferença em relação ao v1 (que recebia AI SDK steps): aqui recebemos
 * ToolAgentTrace['toolCalls'] — array já processado pelo Agent 1, sem
 * necessidade de iterar sobre step.toolResults (temos success diretamente).
 */
export async function createToolEvents(ctx: CreateToolEventsCtx): Promise<void> {
  const { conversationId, steps } = ctx

  try {
    if (!steps.length) return

    const events: Array<Prisma.ConversationEventCreateManyInput> = []

    for (const toolCall of steps) {
      const { toolName, input, success } = toolCall

      // Caso especial: hand_off_to_human tem subtype dinâmico baseado no mode escolhido pelo LLM.
      // Eventos legados (sem input.mode) são tratados como 'transfer' — retrocompat.
      if (toolName === 'hand_off_to_human') {
        const handOffInput = toolCall.input as { mode?: string }
        const subtype = handOffInput.mode === 'notify' ? 'HAND_OFF_NOTIFY' : 'HAND_OFF_TO_HUMAN'
        events.push({
          conversationId,
          type: 'TOOL_SUCCESS',
          toolName,
          content: 'Operação concluída',
          metadata: {
            subtype,
            input: toolCall.input as Record<string, unknown>,
          } as Prisma.InputJsonValue,
          visibleToUser: true,
        })
        continue
      }

      // Tools que sempre resultam em success (search_knowledge, etc.)
      const alwaysSuccessSubtype = ALWAYS_SUCCESS_TOOLS[toolName]
      if (alwaysSuccessSubtype) {
        events.push({
          conversationId,
          type: 'TOOL_SUCCESS',
          toolName,
          content: 'Operação concluída',
          metadata: {
            subtype: alwaysSuccessSubtype,
            input: input as Record<string, unknown>,
          } as Prisma.InputJsonValue,
          // search_knowledge e list_availability são internas — não exibir ao operador
          visibleToUser: toolName !== 'search_knowledge' && toolName !== 'list_availability',
        })
        continue
      }

      // Tools com mapeamento success/failure explícito
      const mapping = TOOL_SUBTYPE_MAP[toolName]
      if (!mapping) continue

      const type: ConversationEventType = success ? 'TOOL_SUCCESS' : 'TOOL_FAILURE'
      const toolInput = input as Record<string, unknown>

      // Caso especial: update_deal com mudança de status (WON/LOST)
      let subtype: string = success ? mapping.success : mapping.failure
      if (toolName === 'update_deal' && success) {
        if (toolInput['status'] === 'WON') {
          subtype = 'DEAL_WON' satisfies ToolSuccessSubtype
        } else if (toolInput['status'] === 'LOST') {
          subtype = 'DEAL_LOST' satisfies ToolSuccessSubtype
        }
      }

      const content = success ? 'Operação concluída' : 'Operação falhou'

      events.push({
        conversationId,
        type,
        toolName,
        content,
        metadata: {
          subtype,
          input: toolInput,
        } as Prisma.InputJsonValue,
        visibleToUser: true,
      })
    }

    if (events.length > 0) {
      await db.conversationEvent.createMany({ data: events })
    }
  } catch (error) {
    logger.warn('Falha ao criar tool events na timeline (non-fatal)', {
      conversationId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

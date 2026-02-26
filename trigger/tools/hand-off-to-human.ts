import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import type { ToolContext } from './types'

export function createHandOffToHumanTool(ctx: ToolContext) {
  return tool({
    description:
      'Transfere a conversa para um atendente humano. Use quando o cliente solicitar falar com uma pessoa, quando não souber responder, ou em situações delicadas.',
    inputSchema: z.object({
      reason: z
        .string()
        .describe(
          'Motivo da transferência (ex: "Cliente solicitou atendimento humano")',
        ),
    }),
    execute: async ({ reason }) => {
      // pausedAt: null → pausa indefinida (auto-unpause NÃO dispara)
      await db.agentConversation.update({
        where: { id: ctx.conversationId },
        data: {
          aiPaused: true,
          pausedAt: null,
        },
      })

      logger.info('Tool hand_off_to_human executed', {
        reason,
        conversationId: ctx.conversationId,
        agentId: ctx.agentId,
      })

      return {
        success: true,
        message: 'Conversa transferida para atendimento humano.',
      }
    },
  })
}

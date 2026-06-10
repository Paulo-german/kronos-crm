import { tool } from 'ai'
import { z } from 'zod'
import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { createConversationEvent } from '../lib/create-conversation-event'
import { routeConversation } from '../lib/route-conversation'
import type { ToolContext } from './types'
import type { InfoSubtype } from '@/_lib/conversation-events/types'

// ---------------------------------------------------------------------------
// Config do grupo injetada no buildToolSet
// ---------------------------------------------------------------------------

export interface GroupToolConfig {
  groupId: string
  workers: Array<{
    agentId: string
    name: string
    scopeLabel: string
  }>
}

// Limite de transfers por janela para prevenção de loop
const TRANSFER_LOOP_THRESHOLD = 3
const TRANSFER_WINDOW_SECONDS = 300 // 5 minutos

// ---------------------------------------------------------------------------
// Factory da tool
// ---------------------------------------------------------------------------

/**
 * Cria a tool `transfer_to_agent` para workers que fazem parte de um grupo.
 *
 * Proteções implementadas:
 * - Anti-loop via Redis: >= 3 transfers BEM-SUCEDIDAS em 5 min → hand_off_to_human
 *   Counter só incrementa após DB update confirmado; erros genuínos não contam.
 * - Consulta routeConversation para decidir o worker destino
 * - Atualiza conversation.activeAgentId
 * - Evento registrado pelo createToolEvents pós-LLM (sem duplicatas)
 */
export function createTransferToAgentTool(
  ctx: ToolContext,
  groupConfig: GroupToolConfig,
) {
  return tool({
    description:
      'Transfere a conversa para outro agente especializado do grupo. ' +
      'Use quando perceber que o assunto está fora do seu escopo de atuação.',
    inputSchema: z.object({
      reason: z.string().describe('Motivo da transferência para outro agente'),
      targetExpertise: z
        .string()
        .optional()
        .describe(
          'Área de expertise desejada (ex: "suporte técnico"). Se omitido, o router decide.',
        ),
    }),
    execute: async ({ reason, targetExpertise }) => {
      const redisKey = `transfer-limit:${ctx.conversationId}`

      // 1. Verificar counter de anti-loop SEM incrementar ainda.
      // Só contamos transferências bem-sucedidas — erros do router ou do DB
      // não constituem loops e não devem disparar escalada para humano.
      const currentCountRaw = await redis.get(redisKey)
      const currentCount = parseInt(currentCountRaw ?? '0', 10)

      if (currentCount >= TRANSFER_LOOP_THRESHOLD) {
        logger.warn('Transfer loop detected, escalating to human', {
          conversationId: ctx.conversationId,
          transferCount: currentCount,
          agentId: ctx.agentId,
        })

        await db.conversation.update({
          where: { id: ctx.conversationId },
          data: { aiPaused: true },
        })

        await createConversationEvent({
          conversationId: ctx.conversationId,
          type: 'INFO',
          content:
            'Loop de transferência detectado. Conversa direcionada para atendimento humano.',
          metadata: {
            subtype: 'AGENT_TRANSFER_LOOP' satisfies InfoSubtype,
            transferCount: currentCount,
            lastAgentId: ctx.agentId,
          },
        })

        return {
          success: true,
          message: 'Vou te direcionar para um atendente humano para melhor te ajudar.',
          handedOffToHuman: true,
        }
      }

      try {
        // 2. Carregar histórico da conversa e injetar contexto de transferência
        const historyMessages = await db.message.findMany({
          where: { conversationId: ctx.conversationId, isArchived: false },
          orderBy: { createdAt: 'asc' },
          take: 50,
          select: { role: true, content: true },
        })

        const messageHistory: Array<{ role: string; content: string }> = [
          ...historyMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          {
            role: 'system',
            content: `[Transferencia solicitada] Motivo: ${reason}.${targetExpertise ? ` Expertise desejada: ${targetExpertise}` : ''}`,
          },
        ]

        // 3. Consultar router para decidir o worker destino
        const routerDecision = await routeConversation({
          groupId: groupConfig.groupId,
          conversationId: ctx.conversationId,
          organizationId: ctx.organizationId,
          messageHistory,
          excludeAgentId: ctx.agentId,
        })

        if (!routerDecision) {
          return {
            success: false,
            message: 'Nenhum agente disponível para transferência no momento.',
          }
        }

        // 4. Atualizar worker ativo na conversa
        await db.conversation.update({
          where: { id: ctx.conversationId },
          data: { activeAgentId: routerDecision.targetAgentId },
        })

        // 5. Registrar transferência no counter após sucesso confirmado.
        // TTL definido apenas na primeira transferência da janela.
        const newCount = await redis.incr(redisKey)
        if (newCount === 1) {
          await redis.expire(redisKey, TRANSFER_WINDOW_SECONDS)
        }

        logger.info('Tool transfer_to_agent executed successfully', {
          from: ctx.agentId,
          to: routerDecision.targetAgentId,
          toName: routerDecision.workerName,
          reason,
          conversationId: ctx.conversationId,
        })

        // createToolEvents (post-LLM) registra o evento AGENT_TRANSFER na timeline
        // usando o campo message como conteúdo — sem duplicata.
        // A próxima mensagem do cliente será processada pelo novo worker
        // automaticamente via conversation.activeAgentId.
        return {
          success: true,
          message: `Conversa transferida para ${routerDecision.workerName}. Motivo: ${reason}`,
          targetAgentId: routerDecision.targetAgentId,
        }
      } catch (error) {
        logger.error('Tool transfer_to_agent failed', {
          error,
          conversationId: ctx.conversationId,
          agentId: ctx.agentId,
        })
        // createToolEvents registra AGENT_TRANSFER_FAILED na timeline usando esta message
        return { success: false, message: 'Erro ao transferir conversa.' }
      }
    },
  })
}

import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import { sendWhatsAppMessage } from '@/_lib/evolution/send-message'
import { revalidateTags } from './lib/revalidate-tags'
import { withRetry, safeBestEffort } from './lib/with-retry'
import type { ToolContext } from './types'

export interface HandOffNotificationConfig {
  notifyTarget: 'none' | 'specific_number' | 'deal_assignee'
  specificPhone?: string
  notificationMessage?: string
}

/**
 * Monta a mensagem de notificação para o atendente.
 * Se `notificationMessage` configurado, usa como base; senão, monta mensagem padrão.
 */
function buildNotificationMessage(
  config: HandOffNotificationConfig,
  agentName: string,
  contactName: string,
  reason: string,
): string {
  if (config.notificationMessage?.trim()) {
    return config.notificationMessage.trim()
  }

  return (
    `[Kronos CRM] Transferência de atendimento\n\n` +
    `O agente ${agentName} transferiu a conversa com ${contactName} para atendimento humano.\n\n` +
    `Motivo: ${reason}\n\n` +
    `Acesse a plataforma para continuar o atendimento.`
  )
}

export function createHandOffToHumanTool(
  ctx: ToolContext,
  config?: HandOffNotificationConfig,
) {
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
      try {
        // pausedAt: null → pausa indefinida (auto-unpause NÃO dispara)
        const result = await withRetry(
          () =>
            db.conversation.updateMany({
              where: { id: ctx.conversationId, organizationId: ctx.organizationId },
              data: {
                aiPaused: true,
                pausedAt: null,
              },
            }),
          'db.conversation.updateMany',
        )

        if (result.count === 0) {
          return { success: false, message: 'Conversa não encontrada nesta organização.' }
        }

        if (ctx.dealId) {
          await safeBestEffort(
            () =>
              db.activity.create({
                data: {
                  type: 'note',
                  content: `Conversa transferida para atendimento humano. Motivo: ${reason}`,
                  dealId: ctx.dealId!,
                  performedBy: null,
                  metadata: { agentId: ctx.agentId, agentName: ctx.agentName },
                },
              }),
            'activity.create',
          )
        }

        // Bloco de notificação WhatsApp — best-effort: falha loga warning mas não bloqueia
        await safeBestEffort(async () => {
          if (config && config.notifyTarget !== 'none') {
            await sendHandOffNotification(ctx, config, reason)
          }
        }, 'whatsapp.notification')

        await safeBestEffort(
          () =>
            revalidateTags([
              `conversation:${ctx.conversationId}`,
              `conversations:${ctx.organizationId}`,
            ]),
          'revalidateTags',
        )

        logger.info('Tool hand_off_to_human executed', {
          reason,
          conversationId: ctx.conversationId,
          agentId: ctx.agentId,
          notifyTarget: config?.notifyTarget ?? 'none',
        })

        return {
          success: true,
          message: 'Conversa transferida para atendimento humano.',
        }
      } catch (error) {
        logger.error('Tool hand_off_to_human failed', { error })
        return { success: false, message: 'Erro interno ao transferir conversa. Tente novamente.' }
      }
    },
  })
}

/**
 * Executa a lógica de notificação do atendente via WhatsApp.
 * Lança erro em caso de falha — o caller deve capturar (best-effort).
 */
async function sendHandOffNotification(
  ctx: ToolContext,
  config: HandOffNotificationConfig,
  reason: string,
): Promise<void> {
  // Buscar instanceName da inbox e nome do contato para montar a mensagem
  const conversation = await db.conversation.findUnique({
    where: { id: ctx.conversationId },
    select: {
      inbox: { select: { evolutionInstanceName: true } },
      contact: { select: { name: true } },
    },
  })

  const instanceName = conversation?.inbox?.evolutionInstanceName
  if (!instanceName) {
    logger.warn('hand_off_to_human: inbox sem evolutionInstanceName, pulando notificação', {
      conversationId: ctx.conversationId,
    })
    return
  }

  const contactName = conversation?.contact?.name ?? 'Contato'

  // Resolver o destinatário da notificação
  let recipientPhone: string | undefined

  if (config.notifyTarget === 'specific_number') {
    if (!config.specificPhone?.trim()) {
      logger.warn('hand_off_to_human: specific_number configurado mas specificPhone vazio, pulando notificação', {
        conversationId: ctx.conversationId,
      })
      return
    }
    recipientPhone = config.specificPhone.trim()
  } else if (config.notifyTarget === 'deal_assignee') {
    if (!ctx.dealId) {
      logger.warn('hand_off_to_human: deal_assignee configurado mas ctx.dealId ausente, pulando notificação', {
        conversationId: ctx.conversationId,
      })
      return
    }

    const deal = await db.deal.findUnique({
      where: { id: ctx.dealId },
      select: {
        assignee: { select: { phone: true, fullName: true } },
      },
    })

    if (!deal?.assignee?.phone?.trim()) {
      logger.warn('hand_off_to_human: deal_assignee sem phone cadastrado, pulando notificação', {
        dealId: ctx.dealId,
        conversationId: ctx.conversationId,
      })
      return
    }

    recipientPhone = deal.assignee.phone.trim()
  }

  if (!recipientPhone) {
    return
  }

  const message = buildNotificationMessage(config, ctx.agentName, contactName, reason)

  await sendWhatsAppMessage(instanceName, recipientPhone, message)

  logger.info('hand_off_to_human: notificação WhatsApp enviada', {
    notifyTarget: config.notifyTarget,
    conversationId: ctx.conversationId,
  })
}

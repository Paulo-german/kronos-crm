import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { revalidateTags } from './lib/revalidate-tags'
import { withRetry, safeBestEffort } from './lib/with-retry'
import {
  notificationPreferencesSchema,
} from '@/_data-access/notification/types'
import type { NotificationType, ConnectionType, Prisma } from '@prisma/client'
import type { ToolContext } from './types'

export interface HandOffNotificationConfig {
  notifyTarget: 'none' | 'specific_number' | 'deal_assignee'
  specificPhone?: string
  notificationMessage?: string
}

// ---------------------------------------------------------------------------
// Tipo interno para dados da conversa necessarios nas notificacoes
// ---------------------------------------------------------------------------

interface ConversationDataForNotification {
  inbox: {
    connectionType: ConnectionType
    evolutionInstanceName: string | null
    evolutionApiUrl: string | null
    evolutionApiKey: string | null
    metaPhoneNumberId: string | null
    metaAccessToken: string | null
    zapiInstanceId: string | null
    zapiToken: string | null
    zapiClientToken: string | null
  }
  contact: {
    name: string | null
    phone: string | null
  } | null
  deal: {
    title: string
    value: Prisma.Decimal | null
    stage: { name: string } | null
  } | null
  organization: {
    slug: string
  } | null
  remoteJid: string | null
}

// Mapeamento de tipo de notificacao para chave de preferencia (replica create-notification.ts sem server-only)
const TYPE_TO_PREFERENCE_KEY: Record<NotificationType, 'system' | 'userAction' | 'platformAnnouncement'> = {
  SYSTEM: 'system',
  USER_ACTION: 'userAction',
  PLATFORM_ANNOUNCEMENT: 'platformAnnouncement',
}

/**
 * Monta a mensagem de notificação para o atendente.
 * Se `notificationMessage` configurado, usa como base; senão, monta mensagem padrão.
 */
interface NotificationMessageContext {
  agentName: string
  contactName: string
  contactPhone: string | null
  reason: string
  dealTitle: string | null
  dealStage: string | null
  dealValue: number | null
  inboxUrl: string | null
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function buildNotificationMessage(
  config: HandOffNotificationConfig,
  context: NotificationMessageContext,
): string {
  if (config.notificationMessage?.trim()) {
    return config.notificationMessage.trim()
  }

  const lines: string[] = [
    '🔔 *Transferência de atendimento*',
    '',
    `O agente *${context.agentName}* transferiu a conversa com *${context.contactName}* para você.`,
    '',
    `📋 *Motivo:* ${context.reason}`,
  ]

  // Dados do deal (se disponíveis)
  if (context.dealTitle) {
    lines.push('')
    lines.push(`💼 *Negócio:* ${context.dealTitle}`)
    if (context.dealStage) {
      lines.push(`📍 *Etapa:* ${context.dealStage}`)
    }
    if (context.dealValue !== null && context.dealValue > 0) {
      lines.push(`💰 *Valor:* ${formatCurrency(context.dealValue)}`)
    }
  }

  // Telefone do contato
  if (context.contactPhone) {
    lines.push('')
    lines.push(`📱 *Contato:* ${context.contactPhone}`)
  }

  // Link direto para a conversa
  if (context.inboxUrl) {
    lines.push('')
    lines.push(`🔗 Acesse a conversa:`)
    lines.push(context.inboxUrl)
  }

  return lines.join('\n')
}

/**
 * Resolve o userId do destinatario da notificacao in-app.
 * - deal_assignee: retorna assignedTo do deal
 * - specific_number: busca membro da org pelo telefone
 * - none: retorna null
 */
async function resolveNotificationTargetUserId(
  ctx: ToolContext,
  config: HandOffNotificationConfig,
): Promise<string | null> {
  if (config.notifyTarget === 'deal_assignee') {
    if (!ctx.dealId) {
      logger.warn('hand_off_to_human: deal_assignee configurado mas ctx.dealId ausente', {
        conversationId: ctx.conversationId,
      })
      return null
    }

    const deal = await db.deal.findUnique({
      where: { id: ctx.dealId },
      select: { assignedTo: true },
    })
    return deal?.assignedTo ?? null
  }

  if (config.notifyTarget === 'specific_number') {
    if (!config.specificPhone?.trim()) return null

    // Buscar membro da org que tenha esse phone cadastrado
    const member = await db.member.findFirst({
      where: {
        organizationId: ctx.organizationId,
        status: 'ACCEPTED',
        user: { phone: config.specificPhone.trim() },
      },
      select: { userId: true },
    })

    if (!member?.userId) {
      logger.warn('hand_off_to_human: specific_number nao encontrado como membro da org', {
        phone: config.specificPhone,
        conversationId: ctx.conversationId,
      })
      return null
    }

    return member.userId
  }

  return null
}

/**
 * Verifica se o usuario tem o tipo de notificacao habilitado nas suas preferencias.
 * Replica a logica de resolveUserPreferences de create-notification.ts sem o server-only.
 */
async function checkUserNotificationPreference(
  userId: string,
  type: NotificationType,
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  })

  // Sem preferencias salvas: default eh tudo ativado
  if (!user?.notificationPreferences) return true

  const parsed = notificationPreferencesSchema.safeParse(user.notificationPreferences)
  // Parse falhou (JSON malformado): fallback seguro — notificar
  if (!parsed.success) return true

  return parsed.data.inApp[TYPE_TO_PREFERENCE_KEY[type]]
}

/**
 * Executa o envio da notificacao WhatsApp para o atendente.
 * Recebe os dados ja buscados da conversation para evitar query duplicada.
 * Lança erro em caso de falha — o caller deve capturar (best-effort).
 */
async function sendHandOffNotification(
  ctx: ToolContext,
  config: HandOffNotificationConfig,
  reason: string,
  conversationData: ConversationDataForNotification,
): Promise<void> {
  const inbox = conversationData.inbox
  if (!inbox) {
    logger.warn('hand_off_to_human: inbox nao encontrada, pulando notificacao WhatsApp', {
      conversationId: ctx.conversationId,
    })
    return
  }

  let provider
  try {
    provider = resolveWhatsAppProvider(inbox)
  } catch (providerError) {
    logger.warn('hand_off_to_human: provider nao configurado, pulando notificacao WhatsApp', {
      conversationId: ctx.conversationId,
      error: providerError instanceof Error ? providerError.message : String(providerError),
    })
    return
  }

  const contactName = conversationData.contact?.name ?? 'Contato'

  // Resolver o destinatario da notificacao WhatsApp
  let recipientPhone: string | undefined

  if (config.notifyTarget === 'specific_number') {
    if (!config.specificPhone?.trim()) {
      logger.warn('hand_off_to_human: specific_number configurado mas specificPhone vazio, pulando notificacao', {
        conversationId: ctx.conversationId,
      })
      return
    }
    recipientPhone = config.specificPhone.trim()
  } else if (config.notifyTarget === 'deal_assignee') {
    if (!ctx.dealId) {
      logger.warn('hand_off_to_human: deal_assignee configurado mas ctx.dealId ausente, pulando notificacao', {
        conversationId: ctx.conversationId,
      })
      return
    }

    const deal = await db.deal.findUnique({
      where: { id: ctx.dealId },
      select: {
        assignee: { select: { phone: true } },
      },
    })

    if (!deal?.assignee?.phone?.trim()) {
      logger.warn('hand_off_to_human: deal_assignee sem phone cadastrado, pulando notificacao', {
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

  // Normalizar telefone: remover caracteres não-numéricos e garantir código do país
  recipientPhone = recipientPhone.replace(/\D/g, '')
  if (recipientPhone.length <= 11) {
    // Número BR sem código de país (ex: 21969990030) — adicionar 55
    recipientPhone = `55${recipientPhone}`
  }

  const maskedPhone = recipientPhone.length > 4
    ? `${recipientPhone.slice(0, 4)}***${recipientPhone.slice(-2)}`
    : '***'

  logger.info('hand_off_to_human: enviando notificacao WhatsApp', {
    notifyTarget: config.notifyTarget,
    recipientPhone: maskedPhone,
    connectionType: inbox.connectionType,
    conversationId: ctx.conversationId,
  })

  // Montar URL da conversa no inbox
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  const orgSlug = conversationData.organization?.slug
  const inboxUrl = appUrl && orgSlug
    ? `${appUrl.startsWith('http') ? appUrl : `https://${appUrl}`}/org/${orgSlug}/inbox?conversationId=${ctx.conversationId}`
    : null

  // Resolver telefone do contato para exibição (remoteJid ou contact.phone)
  const contactPhone = conversationData.contact?.phone
    ?? conversationData.remoteJid?.replace('@s.whatsapp.net', '')
    ?? null

  const message = buildNotificationMessage(config, {
    agentName: ctx.agentName,
    contactName,
    contactPhone,
    reason,
    dealTitle: conversationData.deal?.title ?? null,
    dealStage: conversationData.deal?.stage?.name ?? null,
    dealValue: conversationData.deal?.value ? Number(conversationData.deal.value) : null,
    inboxUrl,
  })

  try {
    const sentIds = await provider.sendText(recipientPhone, message)

    logger.info('hand_off_to_human: notificacao WhatsApp enviada com sucesso', {
      notifyTarget: config.notifyTarget,
      recipientPhone: maskedPhone,
      connectionType: inbox.connectionType,
      sentMessageIds: sentIds,
      conversationId: ctx.conversationId,
    })
  } catch (sendError) {
    // Logar erro detalhado para facilitar debug — o safeBestEffort do caller
    // também vai capturar, mas aqui temos mais contexto
    logger.error('hand_off_to_human: falha ao enviar notificacao WhatsApp', {
      notifyTarget: config.notifyTarget,
      recipientPhone: maskedPhone,
      connectionType: inbox.connectionType,
      conversationId: ctx.conversationId,
      error: sendError instanceof Error ? sendError.message : String(sendError),
      stack: sendError instanceof Error ? sendError.stack : undefined,
    })
    throw sendError // re-throw para o safeBestEffort capturar
  }
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

        // Buscar dados da conversation uma unica vez para reutilizar em ambas as notificacoes
        let conversationData: ConversationDataForNotification | null = null
        try {
          conversationData = await db.conversation.findUnique({
            where: { id: ctx.conversationId },
            select: {
              remoteJid: true,
              inbox: {
                select: {
                  connectionType: true,
                  evolutionInstanceName: true,
                  evolutionApiUrl: true,
                  evolutionApiKey: true,
                  metaPhoneNumberId: true,
                  metaAccessToken: true,
                  zapiInstanceId: true,
                  zapiToken: true,
                  zapiClientToken: true,
                },
              },
              contact: { select: { name: true, phone: true } },
              deal: {
                select: {
                  title: true,
                  value: true,
                  stage: { select: { name: true } },
                },
              },
              organization: { select: { slug: true } },
            },
          })
        } catch (queryError) {
          logger.warn('hand_off_to_human: falha ao buscar dados da conversa, pulando notificacoes', {
            conversationId: ctx.conversationId,
            error: queryError instanceof Error ? queryError.message : String(queryError),
          })
        }

        // Rastrear resultado das notificações para incluir no output da tool
        const notifyTarget = config?.notifyTarget ?? 'none'
        let whatsappNotification: { sent: boolean; recipientPhone?: string; error?: string } = { sent: false }
        let inAppNotification: { sent: boolean; userId?: string } = { sent: false }

        // Bloco de notificacao WhatsApp — captura erro para incluir no output da tool
        if (config && config.notifyTarget !== 'none' && conversationData) {
          // Resolver o phone antecipadamente para incluir no output
          let phone: string | undefined
          if (config.notifyTarget === 'specific_number') {
            phone = config.specificPhone?.trim()
          } else if (config.notifyTarget === 'deal_assignee' && ctx.dealId) {
            const deal = await db.deal.findUnique({
              where: { id: ctx.dealId },
              select: { assignee: { select: { phone: true } } },
            })
            phone = deal?.assignee?.phone?.trim() ?? undefined
          }
          const masked = phone && phone.length > 4
            ? `${phone.slice(0, 4)}***${phone.slice(-2)}`
            : phone ?? 'desconhecido'

          try {
            await sendHandOffNotification(ctx, config, reason, conversationData)
            whatsappNotification = { sent: true, recipientPhone: masked }
          } catch (whatsappError) {
            const errorMsg = whatsappError instanceof Error
              ? whatsappError.message
              : String(whatsappError)
            whatsappNotification = { sent: false, recipientPhone: masked, error: errorMsg }
            logger.warn('whatsapp.notification: best-effort operation failed, skipping', {
              error: errorMsg,
              recipientPhone: masked,
            })
          }
        }

        // Bloco de notificacao in-app — best-effort: falha nao bloqueia o hand-off
        let notifiedUserId: string | null = null
        await safeBestEffort(async () => {
          if (!config || config.notifyTarget === 'none') return
          if (!conversationData) return

          const targetUserId = await resolveNotificationTargetUserId(ctx, config)
          if (!targetUserId) return

          const orgSlug = conversationData.organization?.slug
          if (!orgSlug) return

          const contactName = conversationData.contact?.name ?? 'Contato'

          const shouldNotify = await checkUserNotificationPreference(targetUserId, 'USER_ACTION')
          if (!shouldNotify) return

          await db.notification.create({
            data: {
              organizationId: ctx.organizationId,
              userId: targetUserId,
              type: 'USER_ACTION',
              title: 'Transferência de atendimento',
              body: `O agente ${ctx.agentName} transferiu a conversa com ${contactName}. Motivo: ${reason}`,
              actionUrl: `/org/${orgSlug}/inbox?conversationId=${ctx.conversationId}`,
              resourceType: 'conversation',
              resourceId: ctx.conversationId,
            },
          })

          notifiedUserId = targetUserId
          inAppNotification = { sent: true, userId: targetUserId }

          logger.info('hand_off_to_human: notificacao in-app criada', {
            userId: targetUserId,
            conversationId: ctx.conversationId,
          })
        }, 'inApp.notification')

        // Consolidar tags de revalidacao — incluir notificacoes apenas se notificacao foi de fato criada
        const tagsToRevalidate = [
          `conversation:${ctx.conversationId}`,
          `conversations:${ctx.organizationId}`,
        ]

        if (notifiedUserId) {
          tagsToRevalidate.push(`notifications:${notifiedUserId}`)
        }

        await safeBestEffort(
          () => revalidateTags(tagsToRevalidate),
          'revalidateTags',
        )

        logger.info('Tool hand_off_to_human executed', {
          reason,
          conversationId: ctx.conversationId,
          agentId: ctx.agentId,
          notifyTarget,
          whatsappNotification,
          inAppNotification,
        })

        return {
          success: true,
          message: 'Conversa transferida para atendimento humano.',
          notifyTarget,
          whatsappNotification,
          inAppNotification,
        }
      } catch (error) {
        logger.error('Tool hand_off_to_human failed', { error })
        return { success: false, message: 'Erro interno ao transferir conversa. Tente novamente.' }
      }
    },
  })
}

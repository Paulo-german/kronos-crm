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

export type HandOffMode = 'transfer' | 'notify'

interface HandOffToolInput {
  mode: HandOffMode
  reason: string
}

// ---------------------------------------------------------------------------
// Constantes de wording por modo — evitam strings duplicadas e facilitam i18n
// ---------------------------------------------------------------------------

const TRANSFER_ACTIVITY_PREFIX = 'Conversa transferida para atendimento humano.'
const NOTIFY_ACTIVITY_PREFIX = 'Dúvida encaminhada ao responsável (IA continua conduzindo).'
const TRANSFER_RETURN_MESSAGE = 'Conversa transferida para atendimento humano.'
const NOTIFY_RETURN_MESSAGE =
  'Responsável notificado. Continue atendendo normalmente — avise ao cliente que está verificando a informação e retome o processo de vendas.'

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
 * O wording do header e CTA varia por modo para deixar claro se a IA foi pausada ou não.
 * Se `notificationMessage` configurado pelo step builder, usa como base (comportamento atual).
 */
interface NotificationMessageContext {
  mode: HandOffMode
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

  const isTransfer = context.mode === 'transfer'

  const lines: string[] = isTransfer
    ? [
        '🔔 *Transferência de atendimento*',
        '',
        `O agente *${context.agentName}* transferiu a conversa com *${context.contactName}* para você.`,
        '',
        `📋 *Motivo:* ${context.reason}`,
      ]
    : [
        '❓ *Dúvida do cliente precisa de resposta humana*',
        '',
        `O agente *${context.agentName}* continua atendendo *${context.contactName}*, mas precisa de ajuda pontual para responder:`,
        '',
        `📋 *Dúvida:* ${context.reason}`,
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

  if (!isTransfer) {
    lines.push('')
    lines.push('_Responda via inbox quando tiver a informação. A IA não foi pausada._')
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
 * O mode afeta o wording da mensagem enviada — transfer vs notify.
 * Lança erro em caso de falha — o caller deve capturar (best-effort).
 */
async function sendHandOffNotification(
  ctx: ToolContext,
  config: HandOffNotificationConfig,
  reason: string,
  conversationData: ConversationDataForNotification,
  mode: HandOffMode,
): Promise<void> {
  const inbox = conversationData.inbox
  if (!inbox) {
    logger.warn('hand_off_to_human: inbox nao encontrada, pulando notificacao WhatsApp', {
      conversationId: ctx.conversationId,
    })
    return
  }

  // Simulator não tem número WhatsApp real para receber a notificação.
  // A notificação in-app (criada depois desta função) já funciona normalmente.
  if (inbox.connectionType === 'SIMULATOR') {
    logger.info('hand_off_to_human: simulator mode, skipping WhatsApp notification', {
      conversationId: ctx.conversationId,
      notifyTarget: config.notifyTarget,
      mode,
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
    mode,
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
    mode,
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
      mode,
    })
  } catch (sendError) {
    // Logar erro detalhado para facilitar debug — o safeBestEffort do caller
    // também vai capturar, mas aqui temos mais contexto
    logger.error('hand_off_to_human: falha ao enviar notificacao WhatsApp', {
      notifyTarget: config.notifyTarget,
      recipientPhone: maskedPhone,
      connectionType: inbox.connectionType,
      conversationId: ctx.conversationId,
      mode,
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
      'Envolve um atendente humano no atendimento. Use dois modos: mode="transfer" pausa a IA e entrega o controle; mode="notify" NÃO pausa a IA — apenas notifica o responsável sobre uma dúvida pontual enquanto você continua atendendo.',
    inputSchema: z.object({
      mode: z
        .enum(['transfer', 'notify'])
        .default('transfer')
        .describe(
          'Como envolver o humano. ' +
          '"transfer": pausa a IA e entrega o controle — use quando o cliente pedir explicitamente atendimento humano, reclamar, pedir para cancelar, ou quando a situação fugir do seu escopo. ' +
          '"notify": NÃO pausa a IA — notifica o responsável sobre uma informação pontual que você não sabe responder, enquanto você continua conduzindo o atendimento. Use quando faltar um dado específico (endereço, preço, política) e você quer retomar o processo de vendas.',
        ),
      reason: z.string().describe(
        'Motivo da notificação/transferência. No modo "notify", descreva a dúvida específica (ex: "Cliente perguntou o endereço da loja"). No modo "transfer", descreva por que a IA não deve mais conduzir.',
      ),
    }),
    execute: async (rawInput) => {
      try {
        const { mode, reason } = rawInput as HandOffToolInput

        // Apenas no modo 'transfer' pausamos a IA
        if (mode === 'transfer') {
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
        }
        // No modo 'notify' — não mexer em aiPaused. A IA segue ativa.

        if (ctx.dealId) {
          const activityContent = mode === 'transfer'
            ? `${TRANSFER_ACTIVITY_PREFIX} Motivo: ${reason}`
            : `${NOTIFY_ACTIVITY_PREFIX} Motivo: ${reason}`

          await safeBestEffort(
            () =>
              db.activity.create({
                data: {
                  type: 'note',
                  content: activityContent,
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
            await sendHandOffNotification(ctx, config, reason, conversationData, mode)
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

          const { title, body } = mode === 'transfer'
            ? {
                title: 'Transferência de atendimento',
                body: `O agente ${ctx.agentName} transferiu a conversa com ${contactName}. Motivo: ${reason}`,
              }
            : {
                title: 'Dúvida do cliente precisa de resposta',
                body: `O agente ${ctx.agentName} está atendendo ${contactName} e precisa de ajuda: ${reason}`,
              }

          await db.notification.create({
            data: {
              organizationId: ctx.organizationId,
              userId: targetUserId,
              type: 'USER_ACTION',
              title,
              body,
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
            mode,
          })
        }, 'inApp.notification')

        // Consolidar tags de revalidacao — mesmas tags em ambos os modos para cobrir
        // o caso em que a timeline de eventos aparece no card da conversa
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
          mode,
          reason,
          conversationId: ctx.conversationId,
          agentId: ctx.agentId,
          notifyTarget,
          whatsappNotification,
          inAppNotification,
        })

        return {
          success: true,
          mode,
          message: mode === 'transfer' ? TRANSFER_RETURN_MESSAGE : NOTIFY_RETURN_MESSAGE,
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

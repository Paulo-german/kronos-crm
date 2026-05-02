import 'server-only'
import { db } from '@/_lib/prisma'
import { createNotification } from '@/_lib/notifications/create-notification'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { withRetry } from '@/_lib/whatsapp/retry'
import type { ExecutorContext, ExecutorResult, NotifyUserConfig, NotifyChannel } from '../types'

const PLACEHOLDER_REGEX = /\{\{deal\.(title|stage|assignee|status|priority)\}\}/g

/**
 * Substitui os placeholders do messageTemplate com dados reais do deal.
 * Placeholders suportados: {{deal.title}}, {{deal.stage}}, {{deal.assignee}},
 * {{deal.status}}, {{deal.priority}}
 */
function resolveTemplate(
  template: string,
  ctx: ExecutorContext,
  stageName: string,
  assigneeName: string,
): string {
  return template.replace(PLACEHOLDER_REGEX, (_match, field: string) => {
    switch (field) {
      case 'title':
        return ctx.deal.title
      case 'stage':
        return stageName
      case 'assignee':
        return assigneeName
      case 'status':
        return ctx.deal.status
      case 'priority':
        return ctx.deal.priority
      default:
        return ''
    }
  })
}

/**
 * Normaliza um telefone do User para formato WhatsApp (somente dígitos + sufixo @s.whatsapp.net).
 * Retorna null se o telefone não tiver dígitos suficientes para ser enviável.
 */
function buildWhatsappJid(rawPhone: string | null): string | null {
  if (!rawPhone) return null
  const digits = rawPhone.replace(/\D/g, '')
  // Mínimo de 10 dígitos (DDD + número) para evitar enviar lixo
  if (digits.length < 10) return null
  return `${digits}@s.whatsapp.net`
}

/**
 * Executor de notificação — execução de sistema, sem RBAC.
 * Suporta alvo: deal_assignee, specific_users e org_admins.
 * Suporta canais: in_app (via createNotification, respeita preferências) e whatsapp
 * (envia para o telefone pessoal do user usando o primeiro inbox WhatsApp ativo da org).
 */
export async function executeNotifyUser(ctx: ExecutorContext): Promise<ExecutorResult> {
  const config = ctx.actionConfig as unknown as NotifyUserConfig
  const channels: NotifyChannel[] = config.channels && config.channels.length > 0
    ? config.channels
    : ['in_app']

  // Resolve nomes para substituição no template
  const [stage, assigneeUser] = await Promise.all([
    db.pipelineStage.findUnique({
      where: { id: ctx.deal.stageId },
      select: { name: true },
    }),
    db.user.findUnique({
      where: { id: ctx.deal.assignedTo },
      select: { fullName: true },
    }),
  ])

  const stageName = stage?.name ?? ctx.deal.stageId
  const assigneeName = assigneeUser?.fullName ?? ctx.deal.assignedTo

  const resolvedBody = resolveTemplate(config.messageTemplate, ctx, stageName, assigneeName)

  // Resolve a lista de destinatários conforme o targetType
  let recipientIds: string[] = []

  if (config.targetType === 'deal_assignee') {
    recipientIds = [ctx.deal.assignedTo]
  } else if (config.targetType === 'specific_users' && config.targetUserIds) {
    recipientIds = config.targetUserIds
  } else if (config.targetType === 'org_admins') {
    const admins = await db.member.findMany({
      where: {
        organizationId: ctx.orgId,
        status: 'ACCEPTED',
        role: { in: ['ADMIN', 'OWNER'] },
        userId: { not: null },
      },
      select: { userId: true },
    })
    recipientIds = admins
      .map((member) => member.userId)
      .filter((userId): userId is string => userId !== null)
  }

  if (recipientIds.length === 0) {
    return {
      summary: {
        skipped: true,
        reason: 'no_recipients',
        targetType: config.targetType,
        channels,
      },
    }
  }

  // Busca usuários (uma única query para evitar N+1 entre canais)
  const recipients = await db.user.findMany({
    where: { id: { in: recipientIds } },
    select: { id: true, fullName: true, phone: true },
  })

  const inAppSummary = { sent: 0, failed: 0 }
  const whatsappSummary = { sent: 0, failed: 0, skipped: 0 }

  // ── Canal in-app ───────────────────────────────────────────
  if (channels.includes('in_app')) {
    const orgSlug = await getOrgSlug(ctx.orgId)
    const actionUrl = orgSlug ? `/org/${orgSlug}/crm/deals/${ctx.deal.id}` : undefined
    const notificationTitle = `Automação: ${ctx.automationName}`

    const results = await Promise.allSettled(
      recipients.map((user) =>
        createNotification({
          orgId: ctx.orgId,
          userId: user.id,
          type: 'USER_ACTION',
          title: notificationTitle,
          body: resolvedBody,
          actionUrl,
          resourceType: 'deal',
          resourceId: ctx.deal.id,
        }),
      ),
    )

    inAppSummary.sent = results.filter((result) => result.status === 'fulfilled').length
    inAppSummary.failed = results.filter((result) => result.status === 'rejected').length
  }

  // ── Canal WhatsApp ─────────────────────────────────────────
  if (channels.includes('whatsapp')) {
    // Pega o primeiro inbox WhatsApp ativo da org como remetente
    const inbox = await db.inbox.findFirst({
      where: {
        organizationId: ctx.orgId,
        isActive: true,
        channel: 'WHATSAPP',
      },
      select: {
        connectionType: true,
        channel: true,
        evolutionInstanceName: true,
        evolutionApiUrl: true,
        evolutionApiKey: true,
        metaPhoneNumberId: true,
        metaAccessToken: true,
        metaIgUserId: true,
        zapiInstanceId: true,
        zapiToken: true,
        zapiClientToken: true,
      },
    })

    if (!inbox) {
      // Sem inbox WhatsApp configurado — todas as notificações WhatsApp são puladas
      whatsappSummary.skipped = recipients.length
    } else {
      const provider = resolveWhatsAppProvider(inbox)

      const results = await Promise.allSettled(
        recipients.map(async (user) => {
          const jid = buildWhatsappJid(user.phone)
          if (!jid) {
            return { skipped: true as const }
          }
          await withRetry(() => provider.sendText(jid, resolvedBody))
          return { skipped: false as const }
        }),
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.skipped) {
            whatsappSummary.skipped += 1
          } else {
            whatsappSummary.sent += 1
          }
        } else {
          whatsappSummary.failed += 1
        }
      }
    }
  }

  return {
    summary: {
      targetType: config.targetType,
      recipientCount: recipientIds.length,
      channels,
      inApp: inAppSummary,
      whatsapp: whatsappSummary,
    },
  }
}

import 'server-only'
import { db } from '@/_lib/prisma'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'
import { resolveTemplate } from '../template-resolver'
import { deliverNotification } from './_lib/notify-recipients'
import type { ExecutorContext, ExecutorResult, NotifyUserConfig, NotifyChannel } from '../types'

/**
 * Variante do executor NOTIFY_USER para triggers de contato (subjectKind 'contact').
 * Opera sem deal: notifica usuários no contexto de um contato.
 *
 * O alvo 'deal_assignee' é inválido aqui (não há negociação → sem responsável de deal).
 * Já barrado por schema/action/UI; tratado defensivamente como SKIP explícito —
 * NÃO faz fallback para o responsável do contato.
 */
export async function executeNotifyUserContact(ctx: ExecutorContext): Promise<ExecutorResult> {
  if (!ctx.contact) return { summary: { skipped: true, reason: 'subject_not_contact' } }
  const contact = ctx.contact
  const config = ctx.actionConfig as unknown as NotifyUserConfig
  const channels: NotifyChannel[] = config.channels && config.channels.length > 0
    ? config.channels
    : ['in_app']

  // 'deal_assignee' não existe no contexto de contato — SKIP explícito (sem fallback)
  if (config.targetType === 'deal_assignee') {
    return { summary: { skipped: true, reason: 'deal_assignee_unsupported_for_contact' } }
  }

  const contactFirstName = contact.name.split(' ')[0] ?? ''
  const resolvedBody = resolveTemplate(config.messageTemplate, {
    contact: { name: contact.name, firstName: contactFirstName },
    user: { name: '' },
  })

  // Resolve a lista de destinatários conforme o targetType
  let recipientIds: string[] = []

  if (config.targetType === 'specific_users' && config.targetUserIds) {
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

  const orgSlug = await getOrgSlug(ctx.orgId)
  const actionUrl = orgSlug ? `/org/${orgSlug}/crm/contacts/${contact.id}` : undefined

  const { inApp, whatsapp } = await deliverNotification({
    orgId: ctx.orgId,
    recipientIds,
    channels,
    resolvedBody,
    notificationTitle: `Automação: ${ctx.automationName}`,
    actionUrl,
    resourceType: 'contact',
    resourceId: contact.id,
  })

  return {
    summary: {
      targetType: config.targetType,
      recipientCount: recipientIds.length,
      channels,
      inApp,
      whatsapp,
    },
  }
}

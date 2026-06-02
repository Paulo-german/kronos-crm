import 'server-only'
import { db } from '@/_lib/prisma'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'
import { resolveTemplate } from '../template-resolver'
import { deliverNotification } from './_lib/notify-recipients'
import { executeNotifyUserContact } from './notify-user-contact'
import type { ExecutorContext, ExecutorResult, NotifyUserConfig, NotifyChannel } from '../types'

/**
 * Dispatcher do executor NOTIFY_USER — execução de sistema, sem RBAC.
 * Despacha para a variante de contato (subjectKind 'contact') ou de deal (demais triggers).
 * Suporta alvo: deal_assignee, specific_users e org_admins.
 * Suporta canais: in_app (via createNotification, respeita preferências) e whatsapp
 * (envia para o telefone pessoal do user usando o primeiro inbox WhatsApp ativo da org).
 */
export async function executeNotifyUser(ctx: ExecutorContext): Promise<ExecutorResult> {
  if (ctx.subjectKind === 'contact') return executeNotifyUserContact(ctx)
  if (!ctx.deal) return { summary: { skipped: true, reason: 'subject_not_deal' } }
  const deal = ctx.deal
  const config = ctx.actionConfig as unknown as NotifyUserConfig
  const channels: NotifyChannel[] = config.channels && config.channels.length > 0
    ? config.channels
    : ['in_app']

  // Resolve nomes para substituição no template
  const [stage, assigneeUser] = await Promise.all([
    db.pipelineStage.findUnique({
      where: { id: deal.stageId },
      select: { name: true },
    }),
    db.user.findUnique({
      where: { id: deal.assignedTo },
      select: { fullName: true },
    }),
  ])

  const stageName = stage?.name ?? deal.stageId
  const assigneeName = assigneeUser?.fullName ?? deal.assignedTo

  const primaryContact = deal.contacts.find((contact) => contact.isPrimary) ?? deal.contacts[0]
  const contactFullName = primaryContact?.contact.name ?? ''
  const contactFirstName = contactFullName.split(' ')[0] ?? ''

  const resolvedBody = resolveTemplate(config.messageTemplate, {
    deal: {
      title: deal.title,
      stage: stageName,
      assignee: assigneeName,
      status: deal.status,
      priority: deal.priority,
      value: deal.value != null ? String(deal.value) : '',
    },
    contact: { name: contactFullName, firstName: contactFirstName },
    user: { name: assigneeName },
  })

  // Resolve a lista de destinatários conforme o targetType
  let recipientIds: string[] = []

  if (config.targetType === 'deal_assignee') {
    recipientIds = [deal.assignedTo]
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

  const orgSlug = await getOrgSlug(ctx.orgId)
  const actionUrl = orgSlug ? `/org/${orgSlug}/crm/deals/${deal.id}` : undefined

  const { inApp, whatsapp } = await deliverNotification({
    orgId: ctx.orgId,
    recipientIds,
    channels,
    resolvedBody,
    notificationTitle: `Automação: ${ctx.automationName}`,
    actionUrl,
    resourceType: 'deal',
    resourceId: deal.id,
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

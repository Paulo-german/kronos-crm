import 'server-only'
import { db } from '@/_lib/prisma'
import { createNotification } from '@/_lib/notifications/create-notification'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'
import type { ExecutorContext, ExecutorResult, NotifyUserConfig } from '../types'

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
 * Executor de notificação in-app — execução de sistema, sem RBAC.
 * Suporta alvo: deal_assignee, specific_users e org_admins.
 * Respeita as preferências individuais de notificação de cada usuário (via createNotification).
 */
export async function executeNotifyUser(ctx: ExecutorContext): Promise<ExecutorResult> {
  const config = ctx.actionConfig as unknown as NotifyUserConfig

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

  const orgSlug = await getOrgSlug(ctx.orgId)
  const actionUrl = orgSlug ? `/org/${orgSlug}/crm/deals/${ctx.deal.id}` : undefined

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
    return { summary: { skipped: true, reason: 'no_recipients', targetType: config.targetType } }
  }

  const notificationTitle = `Automação: ${ctx.automationName}`

  // Dispara notificações em paralelo — respeitando prefs individuais via createNotification
  const results = await Promise.allSettled(
    recipientIds.map((userId) =>
      createNotification({
        orgId: ctx.orgId,
        userId,
        type: 'USER_ACTION',
        title: notificationTitle,
        body: resolvedBody,
        actionUrl,
        resourceType: 'deal',
        resourceId: ctx.deal.id,
      }),
    ),
  )

  const sent = results.filter((result) => result.status === 'fulfilled').length
  const failed = results.filter((result) => result.status === 'rejected').length

  return {
    summary: {
      targetType: config.targetType,
      recipientCount: recipientIds.length,
      sent,
      failed,
    },
  }
}

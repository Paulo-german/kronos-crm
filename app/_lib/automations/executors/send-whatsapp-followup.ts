import 'server-only'

import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { withRetry } from '@/_lib/whatsapp/retry'
import { normalizePhoneToJid } from '@/_lib/whatsapp/normalize-phone'
import { resolveTemplate } from '../template-resolver'
import { redis } from '@/_lib/redis'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import type { ExecutorContext, ExecutorResult, SendWhatsappFollowupConfig } from '../types'

// TTL do dedup Redis em segundos — evita reprocessamento do webhook como mensagem do cliente
const DEDUP_TTL_SECONDS = 300

export async function executeSendWhatsappFollowup(ctx: ExecutorContext): Promise<ExecutorResult> {
  const config = ctx.actionConfig as unknown as SendWhatsappFollowupConfig

  // Quota mensal de follow-ups via automação — compartilha o limite da IA
  const quota = await checkPlanQuota(ctx.orgId, 'follow_up_monthly')
  if (!quota.withinQuota) {
    return { summary: { skipped: true, reason: 'quota_exceeded' } }
  }

  const inbox = await db.inbox.findFirst({
    where: { id: config.inboxId, organizationId: ctx.orgId, isActive: true },
    select: {
      id: true,
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

  if (!inbox) return { summary: { skipped: true, reason: 'inbox_not_found' } }

  // Meta Cloud API não suportado nesta ação — requer templates pré-aprovados
  if (inbox.connectionType === 'META_CLOUD') {
    return { summary: { skipped: true, reason: 'meta_not_supported' } }
  }

  const primary = ctx.deal.contacts.find((contact) => contact.isPrimary) ?? ctx.deal.contacts[0]
  if (!primary?.contact.phone) return { summary: { skipped: true, reason: 'no_phone' } }

  const [stageRow, assigneeRow] = await Promise.all([
    ctx.deal.stageId
      ? db.pipelineStage.findUnique({ where: { id: ctx.deal.stageId }, select: { name: true } })
      : null,
    ctx.deal.assignedTo
      ? db.user.findUnique({ where: { id: ctx.deal.assignedTo }, select: { fullName: true } })
      : null,
  ])

  const stageName = stageRow?.name ?? ''
  const assigneeName = assigneeRow?.fullName ?? ''
  const contactFullName = primary.contact.name
  const contactFirstName = contactFullName.split(' ')[0] ?? ''

  const body = resolveTemplate(config.messageTemplate, {
    deal: {
      title: ctx.deal.title,
      stage: stageName,
      assignee: assigneeName,
      status: ctx.deal.status,
      priority: ctx.deal.priority,
      value: ctx.deal.value != null ? String(ctx.deal.value) : '',
    },
    contact: { name: contactFullName, firstName: contactFirstName },
    user: { name: assigneeName },
  })

  let conversation = await db.conversation.findFirst({
    where: { inboxId: inbox.id, contactId: primary.contactId, channel: 'WHATSAPP' },
    select: { id: true, remoteJid: true },
  })

  if (!conversation) {
    if (config.noConversationBehavior === 'skip') {
      return { summary: { skipped: true, reason: 'no_conversation' } }
    }

    const jid = normalizePhoneToJid(primary.contact.phone)
    if (!jid) return { summary: { skipped: true, reason: 'invalid_phone' } }

    conversation = await db.conversation.create({
      data: {
        inboxId: inbox.id,
        contactId: primary.contactId,
        channel: 'WHATSAPP',
        remoteJid: jid,
        organizationId: ctx.orgId,
        ...(ctx.deal.id ? { dealId: ctx.deal.id } : {}),
      },
      select: { id: true, remoteJid: true },
    })
  }

  const remoteJid = conversation.remoteJid
  if (!remoteJid) return { summary: { skipped: true, reason: 'missing_remote_jid' } }

  const provider = resolveWhatsAppProvider(inbox)
  const messageIds = await withRetry(() => provider.sendText(remoteJid, body))

  const lastMessageId = messageIds[messageIds.length - 1]

  await db.message.create({
    data: {
      conversationId: conversation.id,
      role: 'assistant',
      content: body,
      providerMessageId: lastMessageId,
      deliveryStatus: 'sent',
      // source: 'follow_up' é obrigatório — o contador de quota follow_up_monthly
      // filtra por esse valor. Sem ele a cota nunca seria debitada.
      metadata: {
        source: 'follow_up',
        automationId: ctx.automationId,
        automationName: ctx.automationName,
      },
    },
  })

  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageRole: 'assistant',
      unreadCount: 0,
      aiPaused: true,
      pausedAt: new Date(),
    },
  })

  // Dedup: evita que o webhook reprocesse a mensagem enviada como se fosse do cliente
  for (const msgId of messageIds) {
    await redis.set(`dedup:${msgId}`, '1', 'EX', DEDUP_TTL_SECONDS)
  }

  revalidateTag(`conversations:${ctx.orgId}`)
  revalidateTag(`conversation-messages:${conversation.id}`)

  return {
    summary: {
      messageIds,
      conversationId: conversation.id,
      contactId: primary.contactId,
    },
  }
}

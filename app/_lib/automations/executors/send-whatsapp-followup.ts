import 'server-only'

import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { withRetry } from '@/_lib/whatsapp/retry'
import { normalizePhoneToJid } from '@/_lib/whatsapp/normalize-phone'
import { resolveTemplate } from '../template-resolver'
import { redis } from '@/_lib/redis'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import type { Prisma } from '@prisma/client'
import type { ExecutorContext, ExecutorResult, SendWhatsappFollowupConfig } from '../types'

// TTL do dedup Redis em segundos — evita reprocessamento do webhook como mensagem do cliente
const DEDUP_TTL_SECONDS = 300

// Valor sentinela: usa o inbox da conversa mais recente do contato na org
const SENTINEL_DEAL_INBOX = 'deal_inbox'

// Select reutilizado para inbox tanto no path direto quanto no sentinela
const INBOX_SELECT = {
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
} as const

type InboxRow = Prisma.InboxGetPayload<{ select: typeof INBOX_SELECT }>

export async function executeSendWhatsappFollowup(ctx: ExecutorContext): Promise<ExecutorResult> {
  const config = ctx.actionConfig as unknown as SendWhatsappFollowupConfig

  // Quota mensal de follow-ups via automação — compartilha o limite da IA
  const quota = await checkPlanQuota(ctx.orgId, 'follow_up_monthly')
  if (!quota.withinQuota) {
    return { summary: { skipped: true, reason: 'quota_exceeded' } }
  }

  const primary = ctx.deal.contacts.find((contact) => contact.isPrimary) ?? ctx.deal.contacts[0]
  if (!primary?.contact.phone) return { summary: { skipped: true, reason: 'no_phone' } }

  // Resolve inbox e conversa de acordo com o modo de seleção
  let inbox: InboxRow
  let preloadedConversation: { id: string; remoteJid: string | null } | null = null

  if (config.inboxId === SENTINEL_DEAL_INBOX) {
    // Busca a conversa mais recente do contato em qualquer inbox WhatsApp ativo da org
    const existing = await db.conversation.findFirst({
      where: {
        organizationId: ctx.orgId,
        contactId: primary.contactId,
        channel: 'WHATSAPP',
        inbox: { isActive: true, channel: 'WHATSAPP' },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        remoteJid: true,
        inbox: { select: INBOX_SELECT },
      },
    })
    if (!existing) {
      return { summary: { skipped: true, reason: 'no_existing_conversation' } }
    }
    inbox = existing.inbox
    preloadedConversation = { id: existing.id, remoteJid: existing.remoteJid }
  } else {
    const found = await db.inbox.findFirst({
      where: { id: config.inboxId, organizationId: ctx.orgId, isActive: true },
      select: INBOX_SELECT,
    })
    if (!found) return { summary: { skipped: true, reason: 'inbox_not_found' } }
    inbox = found
  }

  // Meta Cloud API não suportado nesta ação — requer templates pré-aprovados
  if (inbox.connectionType === 'META_CLOUD') {
    return { summary: { skipped: true, reason: 'meta_not_supported' } }
  }

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

  // No modo sentinela a conversa já foi encontrada — evita nova query
  let conversation = preloadedConversation ?? await db.conversation.findFirst({
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

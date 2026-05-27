import 'server-only'

import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { withRetry } from '@/_lib/whatsapp/retry'
import { normalizePhoneToJid } from '@/_lib/whatsapp/normalize-phone'
import { resolveTemplate } from '../template-resolver'
import { redis } from '@/_lib/redis'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { INBOX_SELECT, SENTINEL_DEAL_INBOX, type InboxRow } from './_lib/inbox-select'
import type { ExecutorContext, ExecutorResult, SendWhatsappFollowupConfig } from '../types'

// TTL do dedup Redis em segundos — evita reprocessamento do webhook como mensagem do cliente
const DEDUP_TTL_SECONDS = 300

/**
 * Variante do executor SEND_WHATSAPP_FOLLOWUP para o trigger CONTACT_CREATED.
 * Opera sobre o contato (sem deal), buscando/criando a conversa direta por contactId.
 */
export async function executeSendWhatsappFollowupContact(
  ctx: ExecutorContext,
): Promise<ExecutorResult> {
  if (!ctx.contact) return { summary: { skipped: true, reason: 'subject_not_contact' } }
  const contact = ctx.contact

  const config = ctx.actionConfig as unknown as SendWhatsappFollowupConfig

  // Quota mensal de follow-ups via automação — compartilha o limite da IA
  const quota = await checkPlanQuota(ctx.orgId, 'follow_up_monthly')
  if (!quota.withinQuota) {
    return { summary: { skipped: true, reason: 'quota_exceeded' } }
  }

  if (!contact.phone) return { summary: { skipped: true, reason: 'no_phone' } }

  // Resolve inbox e conversa de acordo com o modo de seleção
  let inbox: InboxRow
  let preloadedConversation: { id: string; remoteJid: string | null } | null = null

  if (config.inboxId === SENTINEL_DEAL_INBOX) {
    // Busca a conversa mais recente do contato em qualquer inbox WhatsApp ativo da org
    const existing = await db.conversation.findFirst({
      where: {
        organizationId: ctx.orgId,
        contactId: contact.id,
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

  // Apenas provedores selfhosted são suportados para CONTACT_CREATED.
  // EVOLUTION (sem URL própria) é a instância interna da Kronos — não exposta ao cliente.
  // META_CLOUD exige templates pré-aprovados e não suporta texto livre.
  // SIMULATOR não é um provedor real.
  const SUPPORTED_PROVIDERS = new Set(['EVOLUTION_JS', 'EVOLUTION_GO', 'Z_API'])
  if (!SUPPORTED_PROVIDERS.has(inbox.connectionType)) {
    return { summary: { skipped: true, reason: 'provider_not_supported' } }
  }

  const assigneeRow = contact.assignedTo
    ? await db.user.findUnique({ where: { id: contact.assignedTo }, select: { fullName: true } })
    : null

  const assigneeName = assigneeRow?.fullName ?? ''
  const contactFullName = contact.name
  const contactFirstName = contactFullName.split(' ')[0] ?? ''

  const body = resolveTemplate(config.messageTemplate, {
    contact: { name: contactFullName, firstName: contactFirstName },
    user: { name: assigneeName },
  })

  // No modo sentinela a conversa já foi encontrada — evita nova query
  let conversation = preloadedConversation ?? await db.conversation.findFirst({
    where: { inboxId: inbox.id, contactId: contact.id, channel: 'WHATSAPP' },
    select: { id: true, remoteJid: true },
  })

  if (!conversation) {
    // Trata undefined como 'skip' — safe default para dados persistidos antes do campo existir
    if (!config.noConversationBehavior || config.noConversationBehavior === 'skip') {
      return { summary: { skipped: true, reason: 'no_conversation' } }
    }

    const jid = normalizePhoneToJid(contact.phone)
    if (!jid) return { summary: { skipped: true, reason: 'invalid_phone' } }

    conversation = await db.conversation.create({
      data: {
        inboxId: inbox.id,
        contactId: contact.id,
        channel: 'WHATSAPP',
        remoteJid: jid,
        organizationId: ctx.orgId,
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
  revalidateTag(`contact:${contact.id}`)

  return {
    summary: {
      messageIds,
      conversationId: conversation.id,
      contactId: contact.id,
    },
  }
}

import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { verifyMetaWebhookSignature } from '@/_lib/meta/verify-webhook-signature'
import { parseMetaMessage } from '@/_lib/meta/parse-meta-message'
import { sendMetaTextMessage } from '@/_lib/meta/send-meta-message'
import { resolveConversation } from '@/_lib/evolution/resolve-conversation'
import { checkBusinessHours } from '@/_lib/agent/check-business-hours'
import { scheduleNotifyOrgAdmins } from '@/_lib/notifications/notify-org-admins'
import { resolveAgentForConversation } from '@/../trigger/lib/resolve-agent'
import { tasks } from '@trigger.dev/sdk/v3'
import type { processAgentMessage } from '@/../../trigger/process-agent-message'
import type { MetaWebhookPayload, MetaWebhookValue, MetaTemplateStatusUpdate, MetaMessageStatus } from '@/_lib/meta/types'
import { updateDeliveryStatus, updateDeliveryStatusFailed } from '@/_lib/message-delivery-status'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'
import type { NormalizedWhatsAppMessage } from '@/_lib/evolution/types'
import { AUTO_REOPEN_FIELDS } from '@/_lib/conversation/auto-reopen'
import { hasActivePlan } from '@/_lib/billing/has-active-plan'

// -----------------------------------------------------------------------------
// GET — Verificacao do webhook (Meta chama ao configurar)
// -----------------------------------------------------------------------------
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

// -----------------------------------------------------------------------------
// POST — Processamento de mensagens Meta
// CRITICO: Deve responder 200 em ate 5s ou Meta reenviara o evento
// -----------------------------------------------------------------------------
export async function POST(req: Request) {
  const t0 = Date.now()

  // 1. Validar assinatura HMAC SHA256 — seguranca obrigatoria
  const signature = req.headers.get('x-hub-signature-256')
  const rawBody = await req.text()

  if (!verifyMetaWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload: MetaWebhookPayload = JSON.parse(rawBody)

  // 2. Validar objeto — so processar eventos da WABA
  if (payload.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ignored: true, reason: 'not_whatsapp_business_account' })
  }

  // 3. Processar cada entry/change em paralelo (em producao geralmente e 1)
  // Promise.allSettled para isolamento de erros — falha em um change nao derruba o webhook inteiro
  const results = await Promise.allSettled(
    payload.entry.flatMap((entry) =>
      entry.changes.map((change) => {
        if (change.field === 'message_template_status_update') {
          return processTemplateStatusUpdate(
            entry.id,
            change.value as unknown as MetaTemplateStatusUpdate,
          )
        }
        return processChange(change.value, t0)
      }),
    ),
  )

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[meta-webhook] processChange failed (isolated):', result.reason)
    }
  }

  return NextResponse.json({ success: true })
}

// -----------------------------------------------------------------------------
// Processa atualizacao de status de template (field = "message_template_status_update")
// Invalida o cache de templates do inbox quando o Meta muda o status de um template.
// -----------------------------------------------------------------------------
async function processTemplateStatusUpdate(
  wabaId: string,
  update: MetaTemplateStatusUpdate,
): Promise<void> {
  console.log('[meta-webhook] template_status_update', {
    wabaId,
    templateId: update.message_template_id,
    templateName: update.message_template_name,
    event: update.event,
  })

  const inboxes = await db.inbox.findMany({
    where: { metaWabaId: wabaId },
    select: { id: true },
  })

  for (const inbox of inboxes) {
    revalidateTag(`whatsapp-templates:${inbox.id}`)
  }
}

// -----------------------------------------------------------------------------
// Processa delivery status updates (sent, delivered, read, failed)
// Meta envia esses eventos quando o status de uma mensagem enviada muda.
// Ex: mensagem aceita mas nao entregue por falta de pagamento → status 'failed'
// -----------------------------------------------------------------------------
async function processDeliveryStatuses(statuses: MetaMessageStatus[]): Promise<void> {
  for (const status of statuses) {
    try {
      let result: { conversationId: string; organizationId: string } | null = null

      if (status.status === 'failed') {
        const error = status.errors?.[0]
        result = await updateDeliveryStatusFailed(status.id, error ? {
          code: error.code,
          title: error.title,
          message: error.message,
        } : undefined)
      } else {
        // sent, delivered, read — atualiza status com protecao contra downgrade
        result = await updateDeliveryStatus(status.id, status.status)
      }

      if (result) {
        revalidateTag(`conversations:${result.organizationId}`)
        revalidateTag(`conversation-messages:${result.conversationId}`)
      }
    } catch (error) {
      // Isolamento: falha em um status nao impede processamento dos demais
      console.error('[meta-webhook] processDeliveryStatus failed:', { statusId: status.id, status: status.status, error })
    }
  }
}

// -----------------------------------------------------------------------------
// Processa um change de webhook (field = "messages")
// -----------------------------------------------------------------------------
async function processChange(value: MetaWebhookValue, t0: number): Promise<void> {
  // 4. Processar delivery status updates (sent, delivered, read, failed)
  if (value.statuses && value.statuses.length > 0) {
    await processDeliveryStatuses(value.statuses)
  }

  // Se nao ha mensagens novas, parar aqui (evento era apenas de status)
  if (!value.messages || value.messages.length === 0) return

  const phoneNumberId = value.metadata.phone_number_id

  // Helper de log
  const log = (step: string, outcome: 'PASS' | 'EXIT' | 'SKIP', extra?: Record<string, unknown>) =>
    console.log(`[meta-webhook] ${step} → ${outcome}`, { phoneNumberId, ...extra })

  // 5. Lookup da Inbox pelo metaPhoneNumberId
  const inbox = await db.inbox.findFirst({
    where: { metaPhoneNumberId: phoneNumberId },
    select: {
      id: true,
      isActive: true,
      organizationId: true,
      autoCreateDeal: true,
      pipelineId: true,
      distributionUserIds: true,
      metaAccessToken: true,
      agentId: true,
      agentGroupId: true,
      agent: {
        select: {
          id: true,
          isActive: true,
          debounceSeconds: true,
          businessHoursEnabled: true,
          businessHoursTimezone: true,
          businessHoursConfig: true,
          outOfHoursMessage: true,
        },
      },
      agentGroup: {
        select: {
          id: true,
          isActive: true,
          members: {
            select: {
              agent: {
                select: {
                  id: true,
                  isActive: true,
                  debounceSeconds: true,
                  businessHoursEnabled: true,
                  businessHoursTimezone: true,
                  businessHoursConfig: true,
                  outOfHoursMessage: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!inbox) {
    log('step:3 inbox_lookup', 'EXIT', { reason: 'no_inbox_found', phoneNumberId })
    return
  }

  const orgId = inbox.organizationId

  // Plan guard: rejeitar mensagens de orgs sem plano ativo
  // processChange() não retorna Response — o early return aqui é silenciosamente ignorado pelo Promise.allSettled
  const orgHasPlan = await hasActivePlan(orgId)
  if (!orgHasPlan) {
    log('step:3b plan_guard', 'EXIT', { reason: 'no_active_plan', orgId })
    return
  }

  const contactAssignContext = {
    distributionUserIds: inbox.distributionUserIds,
    inboxId: inbox.id,
  }

  const dealContext = inbox.autoCreateDeal
    ? {
        pipelineId: inbox.pipelineId,
        distributionUserIds: inbox.distributionUserIds,
        inboxId: inbox.id,
      }
    : undefined

  log('step:3 inbox_lookup', 'PASS', { inboxId: inbox.id, orgId, inboxActive: inbox.isActive, hasAgentId: !!inbox.agentId, hasGroupId: !!inbox.agentGroupId })

  // Processar cada mensagem do change (normalmente 1)
  for (const message of value.messages) {
    const contact = value.contacts?.find((c) => c.wa_id === message.from) ?? {
      profile: { name: '' },
      wa_id: message.from,
    }

    const messageId = message.id
    const logMsg = (step: string, outcome: 'PASS' | 'EXIT' | 'SKIP', extra?: Record<string, unknown>) =>
      console.log(`[meta-webhook] ${step} → ${outcome}`, { msgId: messageId, phoneNumberId, ...extra })

    // 6. Inbox desativada ou sem agente/grupo configurado
    const hasAiConfiguredMeta = !!(inbox.agentId || inbox.agentGroupId)
    if (!inbox.isActive || !hasAiConfiguredMeta) {
      logMsg('step:5 agent_active_check', 'EXIT', { reason: !inbox.isActive ? 'inbox_inactive' : 'no_ai_configured' })

      // Notificar OWNER/ADMIN quando inbox esta desativada (WhatsApp desconectado)
      // Anti-spam: verifica se ja existe notificacao nao lida com mesmo titulo nas ultimas 24h
      if (!inbox.isActive) {
        const recentDisconnectedNotification = await db.notification.findFirst({
          where: {
            organizationId: orgId,
            type: 'SYSTEM',
            title: 'WhatsApp desconectado',
            readAt: null,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        })

        if (!recentDisconnectedNotification) {
          scheduleNotifyOrgAdmins({
            orgId,
            type: 'SYSTEM',
            title: 'WhatsApp desconectado',
            body: `A conexão WhatsApp "${phoneNumberId}" está desativada. Mensagens não estão sendo processadas.`,
            actionPath: '/settings/inboxes',
            resourceType: 'inbox',
            resourceId: inbox.id,
          })
        }
      }

      const normalizedMsg = parseMetaMessage(message, contact, phoneNumberId)

      if (normalizedMsg.type === 'text' && !normalizedMsg.text) continue

      const resolveResult = await resolveConversation(
        inbox.id,
        orgId,
        normalizedMsg.remoteJid,
        normalizedMsg.phoneNumber,
        normalizedMsg.pushName,
        dealContext,
        contactAssignContext,
        false,
      )

      if (resolveResult.isNew) {
        revalidateTag(`pipeline:${orgId}`)
        revalidateTag(`deals:${orgId}`)
        revalidateTag(`contacts:${orgId}`)
        revalidateTag(`dashboard:${orgId}`)
      }

      if (resolveResult.nameUpdated) {
        revalidateTag(`contacts:${orgId}`)
        revalidateTag(`deals:${orgId}`)
        revalidateTag(`pipeline:${orgId}`)
        revalidateTag(`conversations:${orgId}`)
      }

      const dedupResult = await redis
        .set(`dedup:${messageId}`, '1', 'EX', 300, 'NX')
        .catch(() => 'redis_error' as const)

      if (dedupResult !== null) {
        await db.message.create({
          data: {
            conversationId: resolveResult.conversationId,
            role: 'user',
            content: resolveMessageContent(normalizedMsg) || '[mensagem não suportada]',
            providerMessageId: messageId,
            metadata: normalizedMsg.media
              ? ({ media: normalizedMsg.media } as unknown as Prisma.InputJsonValue)
              : undefined,
          },
        })

        // Reset follow-up completo + incrementar unreadCount — qualquer msg do cliente cancela ciclo FUP
        await db.conversation.update({
          where: { id: resolveResult.conversationId },
          data: {
            unreadCount: { increment: 1 },
            lastMessageRole: 'user',
            nextFollowUpAt: null,
            followUpCount: 0,
            lastCustomerMessageAt: new Date(),
            ...AUTO_REOPEN_FIELDS,
          },
        })

        revalidateTag(`conversations:${orgId}`)
        revalidateTag(`conversation-messages:${resolveResult.conversationId}`)
      }

      continue
    }

    // Resolver agente standalone OU grupo
    const metaRemoteJid = `${message.from}@s.whatsapp.net`
    const preResolveConvMeta = inbox.agentGroupId
      ? await db.conversation.findFirst({
          where: { inboxId: inbox.id, remoteJid: metaRemoteJid },
          select: { id: true, activeAgentId: true },
        })
      : null

    const resolvedAgent = await resolveAgentForConversation(inbox, preResolveConvMeta)

    if (!resolvedAgent || !resolvedAgent.isActive) {
      logMsg('step:5 agent_active_check', 'EXIT', { reason: 'agent_inactive_or_unresolved' })
      continue
    }

    logMsg('step:5 agent_active_check', 'PASS', { agentId: resolvedAgent.agentId, requiresRouting: resolvedAgent.requiresRouting })

    // 7. Business hours check — apenas quando não requer routing (router opera 24h)
    if (!resolvedAgent.requiresRouting && resolvedAgent.businessHoursEnabled && resolvedAgent.businessHoursConfig) {
      const isOpen = checkBusinessHours(
        resolvedAgent.businessHoursTimezone,
        resolvedAgent.businessHoursConfig as BusinessHoursConfig,
      )

      if (!isOpen) {
        logMsg('step:6 business_hours', 'EXIT', { reason: 'outside_business_hours' })

        const normalizedMsg = parseMetaMessage(message, contact, phoneNumberId)

        // Usar remoteJid (com @s.whatsapp.net) para consistencia com chave OOH do webhook Evolution
        const oohKey = `ooh-reply:${resolvedAgent.agentId}:${normalizedMsg.remoteJid}`
        const alreadyReplied = await redis.set(oohKey, '1', 'EX', 3600, 'NX').catch(() => null)
        const resolveResult = await resolveConversation(
          inbox.id,
          orgId,
          normalizedMsg.remoteJid,
          normalizedMsg.phoneNumber,
          normalizedMsg.pushName,
          dealContext,
          contactAssignContext,
          false,
        )

        if (resolveResult.isNew) {
          revalidateTag(`pipeline:${orgId}`)
          revalidateTag(`deals:${orgId}`)
          revalidateTag(`contacts:${orgId}`)
          revalidateTag(`dashboard:${orgId}`)
        }

        if (resolveResult.nameUpdated) {
          revalidateTag(`contacts:${orgId}`)
          revalidateTag(`deals:${orgId}`)
          revalidateTag(`pipeline:${orgId}`)
          revalidateTag(`conversations:${orgId}`)
        }

        const dedupResult = await redis
          .set(`dedup:${messageId}`, '1', 'EX', 300, 'NX')
          .catch(() => 'redis_error' as const)

        if (dedupResult !== null) {
          await db.message.create({
            data: {
              conversationId: resolveResult.conversationId,
              role: 'user',
              content: resolveMessageContent(normalizedMsg) || '[mensagem não suportada]',
              providerMessageId: messageId,
              metadata: normalizedMsg.media
                ? ({ media: normalizedMsg.media } as unknown as Prisma.InputJsonValue)
                : undefined,
            },
          })

          // Reset follow-up completo + incrementar unreadCount — qualquer msg do cliente cancela ciclo FUP
          await db.conversation.update({
            where: { id: resolveResult.conversationId },
            data: {
              unreadCount: { increment: 1 },
              lastMessageRole: 'user',
              nextFollowUpAt: null,
              followUpCount: 0,
              lastCustomerMessageAt: new Date(),
              ...AUTO_REOPEN_FIELDS,
            },
          })
        }

        // Enviar auto-reply apenas se tem mensagem configurada e nao enviou recentemente
        const shouldSendAutoReply = !!(resolvedAgent.outOfHoursMessage && alreadyReplied !== null && inbox.metaAccessToken)
        if (shouldSendAutoReply) {
          try {
            const oohIds = await sendMetaTextMessage(
              phoneNumberId,
              inbox.metaAccessToken!,
              message.from,
              resolvedAgent.outOfHoursMessage!,
            )
            await Promise.all(
              oohIds.map((sentId) => redis.set(`dedup:${sentId}`, '1', 'EX', 300).catch(() => {})),
            )
          } catch (error) {
            console.error('[meta-webhook] OOH auto-reply failed:', { msgId: messageId, error })
          }
        }

        revalidateTag(`conversations:${orgId}`)
        if (dedupResult !== null) {
          revalidateTag(`conversation-messages:${resolveResult.conversationId}`)
        }

        continue
      }
    }

    // 8. Normalizar mensagem
    const normalizedMessage = parseMetaMessage(message, contact, phoneNumberId)

    // Filtrar mensagens de texto vazio
    if (normalizedMessage.type === 'text' && !normalizedMessage.text) {
      logMsg('step:7 normalize', 'EXIT', { reason: 'empty_text' })
      continue
    }

    // 9. Dedup + Resolve Conversation em paralelo
    const [dedupResult, resolveResult] = await Promise.all([
      redis
        .set(`dedup:${messageId}`, '1', 'EX', 300, 'NX')
        .catch((error) => {
          console.warn('[meta-webhook] Redis dedup failed, continuing:', { msgId: messageId, error })
          return 'redis_error' as const
        }),
      resolveConversation(
        inbox.id,
        orgId,
        normalizedMessage.remoteJid,
        normalizedMessage.phoneNumber,
        normalizedMessage.pushName,
        dealContext,
        contactAssignContext,
        false,
      ),
    ])

    // Checar dedup — se duplicata, pular esta mensagem
    if (dedupResult === null) {
      logMsg('step:8 dedup', 'EXIT', { reason: 'duplicate' })
      continue
    }

    const { conversationId } = resolveResult

    if (resolveResult.isNew) {
      revalidateTag(`pipeline:${orgId}`)
      revalidateTag(`deals:${orgId}`)
      revalidateTag(`contacts:${orgId}`)
      revalidateTag(`dashboard:${orgId}`)
    }

    if (resolveResult.nameUpdated) {
      revalidateTag(`contacts:${orgId}`)
      revalidateTag(`deals:${orgId}`)
      revalidateTag(`pipeline:${orgId}`)
      revalidateTag(`conversations:${orgId}`)
    }

    // 10. Verificar se IA esta pausada (pausa permanente — so despausa manualmente)
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { aiPaused: true },
    })

    if (conversation?.aiPaused) {
      // IA pausada — salvar mensagem mas nao processar com IA
      try {
        await db.message.create({
          data: {
            conversationId,
            role: 'user',
            content: resolveMessageContent(normalizedMessage),
            providerMessageId: messageId,
            metadata: normalizedMessage.media
              ? ({ media: normalizedMessage.media } as unknown as Prisma.InputJsonValue)
              : undefined,
          },
        })

        // Reset follow-up completo + incrementar unreadCount — qualquer msg do cliente cancela ciclo FUP
        await db.conversation.update({
          where: { id: conversationId },
          data: {
            unreadCount: { increment: 1 },
            lastMessageRole: 'user',
            nextFollowUpAt: null,
            followUpCount: 0,
            lastCustomerMessageAt: new Date(),
            ...AUTO_REOPEN_FIELDS,
          },
        })

        revalidateTag(`conversations:${orgId}`)
        revalidateTag(`conversation-messages:${conversationId}`)
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          (error as { code: string }).code === 'P2002'
        ) {
          logMsg('step:9 ai_paused_save', 'SKIP', { reason: 'duplicate_provider_message_id' })
          continue
        }
        throw error
      }

      logMsg('step:9 ai_pause_check', 'EXIT', { reason: 'ai_paused', conversationId, ms: Date.now() - t0 })
      continue
    }

    // 11. Salvar mensagem
    try {
      await db.message.create({
        data: {
          conversationId,
          role: 'user',
          content: resolveMessageContent(normalizedMessage),
          providerMessageId: messageId,
          metadata: normalizedMessage.media
            ? ({ media: normalizedMessage.media } as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      })
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        logMsg('step:10 save_message', 'SKIP', { reason: 'duplicate_provider_message_id' })
        continue
      }
      throw error
    }

    // 12. Debounce + Dispatch + unreadCount em paralelo
    const debounceTimestamp = Date.now()

    await Promise.all([
      // Reset follow-up completo + incrementar unreadCount — qualquer msg do cliente cancela ciclo FUP ativo
      db.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: { increment: 1 }, lastMessageRole: 'user', nextFollowUpAt: null, followUpCount: 0, lastCustomerMessageAt: new Date(), ...AUTO_REOPEN_FIELDS },
      }),
      redis
        .set(
          `debounce:${conversationId}`,
          String(debounceTimestamp),
          'EX',
          resolvedAgent.debounceSeconds + 120,
        )
        .catch((error) => {
          console.warn('[meta-webhook] Redis debounce set failed:', { msgId: messageId, error })
        }),
      tasks.trigger<typeof processAgentMessage>(
        'process-agent-message',
        {
          message: normalizedMessage,
          agentId: resolvedAgent.agentId,
          conversationId,
          organizationId: orgId,
          debounceTimestamp,
          requiresRouting: resolvedAgent.requiresRouting,
          groupId: resolvedAgent.groupId,
        },
        { delay: `${resolvedAgent.debounceSeconds}s` },
      ),
      // Meta Cloud API nao suporta typing presence para business — pulado intencionalmente
    ])

    revalidateTag(`conversations:${orgId}`)
    revalidateTag(`conversation-messages:${conversationId}`)

    logMsg('step:11 dispatched', 'PASS', {
      conversationId,
      inboxId: inbox.id,
      agentId: resolvedAgent.agentId,
      requiresRouting: resolvedAgent.requiresRouting,
      debounceSeconds: resolvedAgent.debounceSeconds,
      totalMs: Date.now() - t0,
    })
  }
}

// -----------------------------------------------------------------------------
// Helper — resolve conteudo textual de uma mensagem normalizada
// TODO: extract to shared module (duplicado no webhook Evolution)
// -----------------------------------------------------------------------------
function resolveMessageContent(message: NormalizedWhatsAppMessage): string {
  switch (message.type) {
    case 'audio': {
      // seconds pode ser undefined para Meta Cloud (API nao retorna duracao no webhook)
      const durationLabel = message.media?.seconds !== undefined ? ` ${message.media.seconds}s` : ''
      return `[Áudio${durationLabel}]`
    }
    case 'image': {
      const caption = message.text ? `: ${message.text}` : ''
      return `[Imagem${caption}]`
    }
    case 'document': {
      const fileName = message.media?.fileName ?? 'arquivo'
      return `[Documento: ${fileName}]`
    }
    default:
      return message.text ?? ''
  }
}

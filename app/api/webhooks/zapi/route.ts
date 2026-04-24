import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { parseZApiMessage } from '@/_lib/zapi/parse-message'
import { sendZApiTextMessage } from '@/_lib/zapi/send-message'
import { resolveConversation } from '@/_lib/evolution/resolve-conversation'
import { checkBusinessHours } from '@/_lib/agent/check-business-hours'
import { scheduleNotifyOrgAdmins } from '@/_lib/notifications/notify-org-admins'
import { resolveAgentForConversation } from '@/../trigger/lib/resolve-agent'
import { tasks } from '@trigger.dev/sdk/v3'
import type { processAgentMessage } from '@/../../trigger/process-agent-message'
import type { ZApiWebhookPayload, ZApiConfig } from '@/_lib/zapi/types'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'
import type { NormalizedWhatsAppMessage } from '@/_lib/evolution/types'
import { AUTO_REOPEN_FIELDS } from '@/_lib/conversation/auto-reopen'
import { hasActivePlan } from '@/_lib/billing/has-active-plan'

export async function POST(req: Request) {
  const t0 = Date.now()

  // 1. Validacao de assinatura via query param
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.ZAPI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload: ZApiWebhookPayload = await req.json()

  // 2. Filtro de evento — so processar ReceivedCallback (inbound) ou fromMe de SentCallback
  const isReceived = payload.type === 'ReceivedCallback'
  const isSent = payload.type === 'SentCallback'

  if (!isReceived && !isSent) {
    return NextResponse.json({ ignored: true, reason: 'event_not_handled' })
  }

  const { messageId, instanceId, fromMe } = payload

  // Helper de log
  const log = (step: string, outcome: 'PASS' | 'EXIT' | 'SKIP', extra?: Record<string, unknown>) =>
    console.log(`[webhook:zapi] ${step} → ${outcome}`, { msgId: messageId, phone: payload.phone, instanceId, ...extra })

  log('step:1 event_filter', 'PASS', { type: payload.type, fromMe })

  // 3. Filtro de grupo
  if (payload.isGroup) {
    log('step:2 group_filter', 'EXIT', { reason: 'group_message' })
    return NextResponse.json({ ignored: true, reason: 'group_message' })
  }
  log('step:2 group_filter', 'PASS')

  // 4. Lookup da Inbox pela instancia Z-API
  const inbox = await db.inbox.findFirst({
    where: {
      zapiInstanceId: instanceId,
    },
    select: {
      id: true,
      isActive: true,
      organizationId: true,
      autoCreateDeal: true,
      pipelineId: true,
      distributionUserIds: true,
      zapiInstanceId: true,
      zapiToken: true,
      zapiClientToken: true,
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
    log('step:3 inbox_lookup', 'EXIT', { reason: 'no_inbox_found' })
    return NextResponse.json({ ignored: true, reason: 'no_inbox_found' })
  }

  const orgId = inbox.organizationId

  // Plan guard: rejeitar mensagens de orgs sem plano ativo (retorna 200 para o provider não reenviar)
  const orgHasPlan = await hasActivePlan(orgId)
  if (!orgHasPlan) {
    log('step:3b plan_guard', 'EXIT', { reason: 'no_active_plan', orgId })
    return NextResponse.json({ ignored: true, reason: 'no_active_plan' })
  }

  // Montar config Z-API para envio de auto-reply (OOH)
  const zapiConfig: ZApiConfig | null =
    inbox.zapiInstanceId && inbox.zapiToken && inbox.zapiClientToken
      ? { instanceId: inbox.zapiInstanceId, token: inbox.zapiToken, clientToken: inbox.zapiClientToken }
      : null

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

  // remoteJid normalizado para consistencia com Evolution/Meta
  const remoteJid = `${payload.phone}@s.whatsapp.net`

  // 5. Tratamento fromMe — checar dedup ANTES de qualquer DB call
  if (fromMe || isSent) {
    const dedupResult = await redis
      .set(`dedup:${messageId}`, '1', 'EX', 300, 'NX')
      .catch(() => 'redis_error' as const)

    if (dedupResult === null) {
      log('step:4 from_me_bot', 'SKIP', { reason: 'bot_message_deduped', ms: Date.now() - t0 })
      return NextResponse.json({ ignored: true, reason: 'from_me_bot' })
    }

    log('step:4 from_me_human', 'PASS')
    const normalizedMsg = parseZApiMessage(payload)

    if (normalizedMsg.type === 'text' && !normalizedMsg.text) {
      log('step:4a from_me_content', 'SKIP', { reason: 'from_me_empty' })
      return NextResponse.json({ ignored: true, reason: 'from_me_empty' })
    }

    const resolveResult = await resolveConversation(
      inbox.id,
      orgId,
      remoteJid,
      normalizedMsg.phoneNumber,
      normalizedMsg.pushName,
      dealContext,
      contactAssignContext,
      true,
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

    await db.message.create({
      data: {
        conversationId: resolveResult.conversationId,
        role: 'assistant',
        content: resolveMessageContent(normalizedMsg),
        providerMessageId: messageId,
        metadata: {
          sentFrom: 'whatsapp_direct',
          ...(normalizedMsg.media
            ? { media: normalizedMsg.media }
            : {}),
        } as unknown as Prisma.InputJsonValue,
      },
    })

    await db.conversation.updateMany({
      where: { inboxId: inbox.id, remoteJid },
      data: { aiPaused: true, pausedAt: new Date(), lastMessageRole: 'assistant', ...AUTO_REOPEN_FIELDS },
    })

    revalidateTag(`conversations:${orgId}`)
    revalidateTag(`conversation-messages:${resolveResult.conversationId}`)

    log('step:4b from_me_done', 'EXIT', { conversationId: resolveResult.conversationId, aiPaused: true, ms: Date.now() - t0 })
    return NextResponse.json({ success: true, reason: 'from_me_saved' })
  }
  log('step:4 from_me_check', 'PASS')

  // 6. Inbox desativada ou sem agente/grupo configurado — salvar mensagem mas nao processar com IA
  // Para inboxes com grupo, a verificacao lazy e feita via resolveAgentForConversation mais adiante.
  // Aqui fazemos apenas o check rapido de inbox ativa e presenca de agente/grupo configurado.
  const hasAiConfigured = !!(inbox.agentId || inbox.agentGroupId)

  if (!inbox.isActive || !hasAiConfigured) {
    log('step:5 agent_active_check', 'EXIT', { reason: !inbox.isActive ? 'inbox_inactive' : 'no_ai_configured', inboxActive: inbox.isActive, hasAgentId: !!inbox.agentId, hasGroupId: !!inbox.agentGroupId })

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
          body: `A conexao Z-API "${instanceId}" esta desativada. Mensagens nao estao sendo processadas.`,
          actionPath: '/settings/inboxes',
          resourceType: 'inbox',
          resourceId: inbox.id,
        })
      }
    }
    const normalizedMsg = parseZApiMessage(payload)

    if (normalizedMsg.type === 'text' && !normalizedMsg.text) {
      log('step:5a inactive_content', 'SKIP', { reason: 'inactive_empty' })
      return NextResponse.json({ ignored: true, reason: 'inactive_empty' })
    }

    const resolveResult = await resolveConversation(
      inbox.id,
      orgId,
      remoteJid,
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
          content: resolveMessageContent(normalizedMsg) || '[mensagem nao suportada]',
          providerMessageId: messageId,
          metadata: normalizedMsg.media
            ? ({ media: normalizedMsg.media } as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      })

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

    log('step:5b inactive_done', 'EXIT', { conversationId: resolveResult.conversationId, saved: dedupResult !== null, ms: Date.now() - t0 })
    return NextResponse.json({ success: true, reason: 'agent_inactive_message_saved' })
  }

  // Resolver agente standalone OU grupo — suporta ambos os modos de operacao
  // Para grupos, precisamos da conversa para verificar o activeAgentId
  const preResolveConv = inbox.agentGroupId
    ? await db.conversation.findFirst({
        where: { inboxId: inbox.id, remoteJid },
        select: { id: true, activeAgentId: true },
      })
    : null

  const resolvedAgent = await resolveAgentForConversation(inbox, preResolveConv)

  if (!resolvedAgent || !resolvedAgent.isActive) {
    log('step:5 agent_active_check', 'EXIT', { reason: 'agent_inactive_or_unresolved' })
    // Salvar mensagem sem processar com IA (agente inativo ou sem workers no grupo)
    const normalizedMsgInactive = parseZApiMessage(payload)
    if (normalizedMsgInactive.type === 'text' && !normalizedMsgInactive.text) {
      return NextResponse.json({ ignored: true, reason: 'inactive_empty' })
    }
    const resolveInactiveResult = await resolveConversation(
      inbox.id, orgId, remoteJid,
      normalizedMsgInactive.phoneNumber, normalizedMsgInactive.pushName,
      dealContext, contactAssignContext, false,
    )
    if (resolveInactiveResult.isNew) {
      revalidateTag(`pipeline:${orgId}`); revalidateTag(`deals:${orgId}`)
      revalidateTag(`contacts:${orgId}`); revalidateTag(`dashboard:${orgId}`)
    }
    const dedupInactive = await redis.set(`dedup:${messageId}`, '1', 'EX', 300, 'NX').catch(() => 'redis_error' as const)
    if (dedupInactive !== null) {
      await db.message.create({
        data: {
          conversationId: resolveInactiveResult.conversationId,
          role: 'user',
          content: resolveMessageContent(normalizedMsgInactive) || '[mensagem nao suportada]',
          providerMessageId: messageId,
          metadata: normalizedMsgInactive.media ? ({ media: normalizedMsgInactive.media } as unknown as Prisma.InputJsonValue) : undefined,
        },
      })
      await db.conversation.update({
        where: { id: resolveInactiveResult.conversationId },
        data: { unreadCount: { increment: 1 }, lastMessageRole: 'user', nextFollowUpAt: null, followUpCount: 0, lastCustomerMessageAt: new Date(), ...AUTO_REOPEN_FIELDS },
      })
      revalidateTag(`conversations:${orgId}`)
      revalidateTag(`conversation-messages:${resolveInactiveResult.conversationId}`)
    }
    return NextResponse.json({ success: true, reason: 'agent_inactive_message_saved' })
  }

  log('step:5 agent_active_check', 'PASS', { agentId: resolvedAgent.agentId, requiresRouting: resolvedAgent.requiresRouting })

  // 7. Business hours check — apenas para modo standalone ou worker ja ativo
  // Quando requiresRouting = true, o business hours check e feito pelo processAgentMessage apos o routing
  if (!resolvedAgent.requiresRouting && resolvedAgent.businessHoursEnabled && resolvedAgent.businessHoursConfig) {
    const isOpen = checkBusinessHours(
      resolvedAgent.businessHoursTimezone,
      resolvedAgent.businessHoursConfig as BusinessHoursConfig,
    )

    if (!isOpen) {
      log('step:6 business_hours', 'EXIT', { reason: 'outside_business_hours', timezone: resolvedAgent.businessHoursTimezone })

      const oohKey = `ooh-reply:${resolvedAgent.agentId}:${remoteJid}`
      const alreadyReplied = await redis
        .set(oohKey, '1', 'EX', 3600, 'NX')
        .catch(() => null)

      const normalizedMsg = parseZApiMessage(payload)
      const resolveResult = await resolveConversation(
        inbox.id,
        orgId,
        remoteJid,
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
            content: resolveMessageContent(normalizedMsg) || '[mensagem nao suportada]',
            providerMessageId: messageId,
            metadata: normalizedMsg.media
              ? ({ media: normalizedMsg.media } as unknown as Prisma.InputJsonValue)
              : undefined,
          },
        })

        await db.conversation.update({
          where: { id: resolveResult.conversationId },
          data: {
            unreadCount: { increment: 1 },
            lastMessageRole: 'user',
            nextFollowUpAt: null,
            followUpCount: 0,
            ...AUTO_REOPEN_FIELDS,
          },
        })
      }

      // Enviar auto-reply via Z-API (apenas se tem mensagem, nao enviou recentemente e tem config)
      const shouldSendZApiAutoReply = !!(resolvedAgent.outOfHoursMessage && alreadyReplied !== null && zapiConfig)
      const sentAutoReply = shouldSendZApiAutoReply
      if (shouldSendZApiAutoReply && zapiConfig && resolvedAgent.outOfHoursMessage) {
        try {
          const oohIds = await sendZApiTextMessage(zapiConfig, payload.phone, resolvedAgent.outOfHoursMessage)
          await Promise.all(
            oohIds.map((sentId) =>
              redis.set(`dedup:${sentId}`, '1', 'EX', 300).catch(() => {}),
            ),
          )
        } catch (error) {
          console.error('[webhook:zapi] OOH auto-reply failed:', { msgId: messageId, error })
        }
      }

      log('step:6b ooh_done', 'EXIT', { conversationId: resolveResult.conversationId, sentAutoReply, ms: Date.now() - t0 })
      return NextResponse.json({ ignored: true, reason: 'outside_business_hours' })
    }

    log('step:6 business_hours', 'PASS', { timezone: resolvedAgent.businessHoursTimezone })
  } else {
    log('step:6 business_hours', 'PASS', { reason: resolvedAgent.requiresRouting ? 'deferred_to_router' : 'not_configured' })
  }

  // 8. Normalizar mensagem
  const normalizedMessage = parseZApiMessage(payload)

  if (normalizedMessage.type === 'text' && !normalizedMessage.text) {
    log('step:7 normalize', 'EXIT', { reason: 'empty_text' })
    return NextResponse.json({ ignored: true, reason: 'empty_text' })
  }
  log('step:7 normalize', 'PASS', { type: normalizedMessage.type })

  // 9. Dedup + Resolve Conversation em paralelo
  const [dedupResult, resolveResult] = await Promise.all([
    redis
      .set(`dedup:${messageId}`, '1', 'EX', 300, 'NX')
      .catch((error) => {
        console.warn('[webhook:zapi] Redis dedup failed, continuing:', { msgId: messageId, error })
        return 'redis_error' as const
      }),
    resolveConversation(
      inbox.id,
      orgId,
      remoteJid,
      normalizedMessage.phoneNumber,
      normalizedMessage.pushName,
      dealContext,
      contactAssignContext,
      false,
    ),
  ])

  if (dedupResult === null) {
    log('step:8 dedup', 'EXIT', { reason: 'duplicate' })
    return NextResponse.json({ ignored: true, reason: 'duplicate' })
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

  log('step:8 dedup+resolve', 'PASS', { conversationId, isNewConversation: resolveResult.isNew })

  // 10. Verificar se IA esta pausada na conversa (pausa permanente — so despausa manualmente)
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { aiPaused: true },
  })

  if (conversation?.aiPaused) {
    // IA pausada — salvar mensagem do cliente mas nao processar com IA
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
        log('step:9 ai_paused_save', 'SKIP', { reason: 'duplicate_provider_message_id' })
        return NextResponse.json({ success: true, reason: 'duplicate' })
      }
      throw error
    }

    log('step:9 ai_pause_check', 'EXIT', { reason: 'ai_paused', conversationId, ms: Date.now() - t0 })
    return NextResponse.json({ success: true, reason: 'ai_paused_message_saved' })
  } else {
    log('step:9 ai_pause_check', 'PASS', { aiPaused: false })
  }

  // 11. Salvar mensagem (com safety net para P2002)
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
      log('step:10 save_message', 'SKIP', { reason: 'duplicate_provider_message_id' })
      return NextResponse.json({ success: true, reason: 'duplicate' })
    }
    throw error
  }

  // 12. Debounce + Dispatch + unreadCount em paralelo
  const debounceTimestamp = Date.now()

  await Promise.all([
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
        console.warn('[webhook:zapi] Redis debounce set failed:', { msgId: messageId, error })
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
    // Z-API nao tem API documentada de typing presence — skip
  ])

  revalidateTag(`conversations:${orgId}`)
  revalidateTag(`conversation-messages:${conversationId}`)

  log('step:10 dispatched', 'PASS', {
    conversationId,
    inboxId: inbox.id,
    agentId: resolvedAgent.agentId,
    requiresRouting: resolvedAgent.requiresRouting,
    debounceSeconds: resolvedAgent.debounceSeconds,
    totalMs: Date.now() - t0,
  })

  return NextResponse.json({ success: true })
}

// TODO: extrair para modulo compartilhado (duplicado nos webhooks Evolution e Meta)
function resolveMessageContent(message: NormalizedWhatsAppMessage): string {
  switch (message.type) {
    case 'audio':
      return `[Áudio ${message.media?.seconds ?? 0}s]`
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

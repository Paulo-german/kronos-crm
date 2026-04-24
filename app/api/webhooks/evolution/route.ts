import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { parseEvolutionMessage, isGroupMessage, resolveEffectiveJid } from '@/_lib/evolution/parse-message'
import { resolveConversation } from '@/_lib/evolution/resolve-conversation'
import { sendWhatsAppMessage, sendPresence } from '@/_lib/evolution/send-message'
import { checkBusinessHours } from '@/_lib/agent/check-business-hours'
import { scheduleNotifyOrgAdmins } from '@/_lib/notifications/notify-org-admins'
import { resolveAgentForConversation } from '@/../trigger/lib/resolve-agent'
import { tasks } from '@trigger.dev/sdk/v3'
import type { processAgentMessage } from '@/../../trigger/process-agent-message'
import type { EvolutionWebhookPayload, EvolutionConnectionUpdateData, NormalizedWhatsAppMessage } from '@/_lib/evolution/types'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'
import { resolveEvolutionCredentialsByInstanceName, resolveWebhookSecretByInstanceName } from '@/_lib/evolution/resolve-credentials'
import { AUTO_REOPEN_FIELDS } from '@/_lib/conversation/auto-reopen'
import { hasActivePlan } from '@/_lib/billing/has-active-plan'

export async function POST(req: Request) {
  const t0 = Date.now()

  // 1. Validação de assinatura via query param
  // Aceita tanto o secret global (instâncias Kronos) quanto secrets per-inbox (self-hosted)
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  const globalSecret = process.env.EVOLUTION_WEBHOOK_SECRET

  let payload: Record<string, unknown>

  if (secret === globalSecret) {
    // Fast path: secret global bate — instância Kronos gerenciada
    payload = await req.json()
  } else {
    // Secret não é global — pode ser per-inbox (self-hosted)
    // Precisamos ler o payload para extrair o instanceName
    payload = await req.json()
    const instanceName = payload.instance as string | undefined

    if (!instanceName) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const inboxSecret = await resolveWebhookSecretByInstanceName(instanceName)

    if (!inboxSecret || secret !== inboxSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // 2. CONNECTION_UPDATE — atualizar status de conexao no banco
  if (payload.event === 'connection.update') {
    const instanceName = payload.instance as string
    const connectionData = payload.data as EvolutionConnectionUpdateData
    const state = connectionData?.state

    // Ignorar estados intermediarios (ex: 'connecting')
    if (state !== 'open' && state !== 'close') {
      return NextResponse.json({ ignored: true, reason: 'connection_state_ignored' })
    }

    const isConnected = state === 'open'

    const inbox = await db.inbox.findFirst({
      where: { evolutionInstanceName: instanceName },
      select: { id: true, organizationId: true, agentId: true, evolutionConnected: true },
    })

    if (!inbox) {
      return NextResponse.json({ ignored: true, reason: 'no_inbox_found' })
    }

    // Evitar update desnecessario se o estado ja esta correto
    if (inbox.evolutionConnected !== isConnected) {
      await db.inbox.update({
        where: { id: inbox.id },
        data: { evolutionConnected: isConnected },
      })

      revalidateTag(`inbox:${inbox.id}`)
      revalidateTag(`inboxes:${inbox.organizationId}`)
      if (inbox.agentId) {
        revalidateTag(`agent:${inbox.agentId}`)
        revalidateTag(`agents:${inbox.organizationId}`)
      }
    }

    // Notificar admins quando desconectar (com anti-spam 24h)
    if (!isConnected) {
      const recent = await db.notification.findFirst({
        where: {
          organizationId: inbox.organizationId,
          type: 'SYSTEM',
          title: 'Conexao WhatsApp perdida',
          readAt: null,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      })

      if (!recent) {
        scheduleNotifyOrgAdmins({
          orgId: inbox.organizationId,
          type: 'SYSTEM',
          title: 'Conexao WhatsApp perdida',
          body: `A conexao WhatsApp "${instanceName}" foi perdida. Acesse as configuracoes para reconectar.`,
          actionPath: '/settings/inboxes',
          resourceType: 'inbox',
          resourceId: inbox.id,
        })
      }
    }

    return NextResponse.json({ success: true, state })
  }

  // 3. Filtro de evento — so processar messages.upsert a partir daqui
  if (payload.event !== 'messages.upsert') {
    return NextResponse.json({ ignored: true, reason: 'event_not_handled' })
  }

  const typedPayload = payload as unknown as EvolutionWebhookPayload
  const { data, instance: instanceName } = typedPayload
  const { key } = data
  const { fromMe, id: messageId } = key

  // Resolver @lid → @s.whatsapp.net para consistência
  const remoteJid = resolveEffectiveJid(key.remoteJid, key.remoteJidAlt)

  // Helper de log — sempre inclui messageId para rastreio completo
  const log = (step: string, outcome: 'PASS' | 'EXIT' | 'SKIP', extra?: Record<string, unknown>) =>
    console.log(`[webhook] ${step} → ${outcome}`, { msgId: messageId, remoteJid, instance: instanceName, ...extra })

  log('step:1 event_filter', 'PASS', { event: payload.event, fromMe })

  // 3. Filtro de grupo
  if (isGroupMessage(remoteJid)) {
    log('step:2 group_filter', 'EXIT', { reason: 'group_message' })
    return NextResponse.json({ ignored: true, reason: 'group_message' })
  }
  log('step:2 group_filter', 'PASS')

  // 4. Lookup da Inbox pela instância Evolution (com agent opcional para IA)
  const inbox = await db.inbox.findFirst({
    where: {
      evolutionInstanceName: instanceName,
    },
    select: {
      id: true,
      isActive: true,
      organizationId: true,
      autoCreateDeal: true,
      pipelineId: true,
      distributionUserIds: true,
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

  // Resolver credenciais Evolution para este inbox (self-hosted ou globais)
  const inboxCredentials = await resolveEvolutionCredentialsByInstanceName(instanceName)

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

  // 5. Tratamento fromMe — checar dedup ANTES de qualquer DB call
  if (fromMe) {
    // Dedup primeiro — mensagens do bot (pré-registradas no processAgentMessage
    // ou sendMessage) são ignoradas sem nenhum DB call.
    const dedupResult = await redis
      .set(`dedup:${messageId}`, '1', 'EX', 300, 'NX')
      .catch(() => 'redis_error' as const)

    if (dedupResult === null) {
      log('step:4 from_me_bot', 'SKIP', { reason: 'bot_message_deduped', ms: Date.now() - t0 })
      return NextResponse.json({ ignored: true, reason: 'from_me_bot' })
    }

    // Mensagem enviada por humano (direto no WhatsApp) — salvar + pausar IA
    log('step:4 from_me_human', 'PASS')
    const normalizedMsg = parseEvolutionMessage(data, instanceName)

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

  // 6. Inbox desativada, sem agente/grupo ou grupo/agente inativo — salvar mensagem mas não processar com IA
  // Para inboxes com grupo, a verificação é lazy (resolveAgentForConversation é chamado depois).
  // Aqui fazemos apenas o check rápido de inbox ativa e presença de agente/grupo configurado.
  const hasAiConfigured = !!(inbox.agentId || inbox.agentGroupId)

  if (!inbox.isActive || !hasAiConfigured) {
    log('step:5 agent_active_check', 'EXIT', { reason: !inbox.isActive ? 'inbox_inactive' : 'no_ai_configured', inboxActive: inbox.isActive, hasAgentId: !!inbox.agentId, hasGroupId: !!inbox.agentGroupId })

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
          body: `A conexão WhatsApp "${instanceName}" está desativada. Mensagens não estão sendo processadas.`,
          actionPath: '/settings/inboxes',
          resourceType: 'inbox',
          resourceId: inbox.id,
        })
      }
    }
    const normalizedMsg = parseEvolutionMessage(data, instanceName)

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
          content: resolveMessageContent(normalizedMsg) || '[mensagem não suportada]',
          providerMessageId: messageId,
          metadata: normalizedMsg.media
            ? ({ media: normalizedMsg.media } as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      })

      // Incrementar unreadCount + reset follow-up completo (qualquer msg do cliente cancela ciclo FUP)
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

  // Resolver agente standalone OU grupo — suporta ambos os modos de operação
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
    const normalizedMsgInactive = parseEvolutionMessage(data, instanceName)
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
          content: resolveMessageContent(normalizedMsgInactive) || '[mensagem não suportada]',
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

  // 7. Business hours check — apenas para modo standalone ou worker já ativo
  // Quando requiresRouting = true, o business hours check é feito pelo processAgentMessage após o routing
  if (!resolvedAgent.requiresRouting && resolvedAgent.businessHoursEnabled && resolvedAgent.businessHoursConfig) {
    const isOpen = checkBusinessHours(
      resolvedAgent.businessHoursTimezone,
      resolvedAgent.businessHoursConfig as BusinessHoursConfig,
    )

    if (!isOpen) {
      log('step:6 business_hours', 'EXIT', { reason: 'outside_business_hours', timezone: resolvedAgent.businessHoursTimezone })

      // Dedup para auto-reply: máximo 1 resposta por hora por contato
      const oohKey = `ooh-reply:${resolvedAgent.agentId}:${remoteJid}`
      const alreadyReplied = await redis
        .set(oohKey, '1', 'EX', 3600, 'NX')
        .catch(() => null)

      // Salvar mensagem do usuário para manter histórico completo
      const normalizedMsg = parseEvolutionMessage(data, instanceName)
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

      // Dedup de mensagem — protege contra webhook retry da Evolution
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

        // Incrementar unreadCount + reset follow-up completo (qualquer msg do cliente cancela ciclo FUP)
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

      // Enviar auto-reply apenas se tem mensagem configurada e não enviou recentemente
      const sentAutoReply = !!(resolvedAgent.outOfHoursMessage && alreadyReplied !== null)
      if (sentAutoReply) {
        try {
          const oohIds = await sendWhatsAppMessage(instanceName, remoteJid, resolvedAgent.outOfHoursMessage!, inboxCredentials)
          await Promise.all(
            oohIds.map((sentId) =>
              redis.set(`dedup:${sentId}`, '1', 'EX', 300).catch(() => {}),
            ),
          )
        } catch (error) {
          console.error('[webhook] OOH auto-reply failed:', { msgId: messageId, error })
        }
      }

      log('step:6b ooh_done', 'EXIT', { conversationId: resolveResult.conversationId, sentAutoReply, ms: Date.now() - t0 })
      return NextResponse.json({ ignored: true, reason: 'outside_business_hours' })
    }

    log('step:6 business_hours', 'PASS', { timezone: resolvedAgent.businessHoursTimezone })
  } else {
    log('step:6 business_hours', 'PASS', { reason: resolvedAgent.requiresRouting ? 'deferred_to_router' : 'not_configured' })
  }

  // 8. Normalizar mensagem (sync — antes do paralelo pois precisamos do resultado)
  const normalizedMessage = parseEvolutionMessage(data, instanceName)

  // Filtrar mensagens de texto vazio (mas aceitar audio, image, document)
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
        console.warn('[webhook] Redis dedup failed, continuing:', { msgId: messageId, error })
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

  // Checar dedup — se duplicata, retornar early
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

  // 10. Verificar se IA está pausada na conversa (pausa permanente — só despausa manualmente)
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { aiPaused: true },
  })

  if (conversation?.aiPaused) {
    // IA pausada — salvar mensagem do cliente mas não processar com IA
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

      // Incrementar unreadCount + reset follow-up completo (qualquer msg do cliente cancela ciclo FUP)
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

  // 11. Salvar mensagem (com safety net para P2002 — webhook retry com dedup expirado)
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

  // 12. Debounce + Dispatch + unreadCount em paralelo (só se mensagem foi salva)
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
        console.warn('[webhook] Redis debounce set failed:', { msgId: messageId, error })
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
    // "Digitando..." imediato — usuário vê feedback antes do debounce expirar
    sendPresence(instanceName, remoteJid, 'composing', inboxCredentials),
  ])

  // Invalidar cache do inbox
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

// TODO: extract to shared module (duplicado no webhook Meta)
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

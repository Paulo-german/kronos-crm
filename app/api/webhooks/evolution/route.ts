import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { parseEvolutionMessage, isGroupMessage, resolveEffectiveJid } from '@/_lib/evolution/parse-message'
import { resolveConversation } from '@/_lib/evolution/resolve-conversation'
import { sendWhatsAppMessage, sendPresence } from '@/_lib/evolution/send-message'
import { checkBusinessHours } from '@/_lib/agent/check-business-hours'
import { notifyOrgAdmins } from '@/_lib/notifications/notify-org-admins'
import { tasks } from '@trigger.dev/sdk/v3'
import type { processAgentMessage } from '@/../../trigger/process-agent-message'
import type { EvolutionWebhookPayload, NormalizedWhatsAppMessage } from '@/_lib/evolution/types'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'

export async function POST(req: Request) {
  const t0 = Date.now()

  // 1. Validação de assinatura via query param
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.EVOLUTION_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload: EvolutionWebhookPayload = await req.json()

  // 2. Filtro de evento — só processar messages.upsert
  if (payload.event !== 'messages.upsert') {
    return NextResponse.json({ ignored: true, reason: 'event_not_handled' })
  }

  const { data, instance: instanceName } = payload
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
  })

  if (!inbox) {
    log('step:3 inbox_lookup', 'EXIT', { reason: 'no_inbox_found' })
    return NextResponse.json({ ignored: true, reason: 'no_inbox_found' })
  }

  const agent = inbox.agent
  const orgId = inbox.organizationId

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
  log('step:3 inbox_lookup', 'PASS', { inboxId: inbox.id, orgId, inboxActive: inbox.isActive, hasAgent: !!agent, agentActive: agent?.isActive })

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
      data: { aiPaused: true, pausedAt: new Date() },
    })

    revalidateTag(`conversations:${orgId}`)
    revalidateTag(`conversation-messages:${resolveResult.conversationId}`)

    log('step:4b from_me_done', 'EXIT', { conversationId: resolveResult.conversationId, aiPaused: true, ms: Date.now() - t0 })
    return NextResponse.json({ success: true, reason: 'from_me_saved' })
  }
  log('step:4 from_me_check', 'PASS')

  // 6. Inbox desativada, agente ausente ou desativado — salvar mensagem mas não processar com IA
  if (!inbox.isActive || !agent || !agent.isActive) {
    log('step:5 agent_active_check', 'EXIT', { reason: !inbox.isActive ? 'inbox_inactive' : 'agent_inactive', inboxActive: inbox.isActive, hasAgent: !!agent, agentActive: agent?.isActive })

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
        void notifyOrgAdmins({
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
          nextFollowUpAt: null,
          followUpCount: 0,
        },
      })

      revalidateTag(`conversations:${orgId}`)
      revalidateTag(`conversation-messages:${resolveResult.conversationId}`)
    }

    log('step:5b inactive_done', 'EXIT', { conversationId: resolveResult.conversationId, saved: dedupResult !== null, ms: Date.now() - t0 })
    return NextResponse.json({ success: true, reason: 'agent_inactive_message_saved' })
  }
  log('step:5 agent_active_check', 'PASS', { agentId: agent.id })

  // 7. Business hours check — se fora do horário, salva mensagem mas não processa com IA
  if (agent.businessHoursEnabled && agent.businessHoursConfig) {
    const isOpen = checkBusinessHours(
      agent.businessHoursTimezone,
      agent.businessHoursConfig as BusinessHoursConfig,
    )

    if (!isOpen) {
      log('step:6 business_hours', 'EXIT', { reason: 'outside_business_hours', timezone: agent.businessHoursTimezone })

      // Dedup para auto-reply: máximo 1 resposta por hora por contato
      const oohKey = `ooh-reply:${agent.id}:${remoteJid}`
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
            nextFollowUpAt: null,
            followUpCount: 0,
            },
        })
      }

      // Enviar auto-reply apenas se tem mensagem configurada e não enviou recentemente
      const sentAutoReply = !!(agent.outOfHoursMessage && alreadyReplied !== null)
      if (sentAutoReply) {
        try {
          const oohIds = await sendWhatsAppMessage(instanceName, remoteJid, agent.outOfHoursMessage!)
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

    log('step:6 business_hours', 'PASS', { timezone: agent.businessHoursTimezone })
  } else {
    log('step:6 business_hours', 'PASS', { reason: 'not_configured' })
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

  // 10. Verificar se IA está pausada na conversa (com auto-unpause após 30 min)
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { aiPaused: true, pausedAt: true },
  })

  if (conversation?.aiPaused) {
    const AUTO_UNPAUSE_MS = 30 * 60 * 1000 // 30 minutos
    const pausedAgoMs = conversation.pausedAt ? Date.now() - conversation.pausedAt.getTime() : null
    const shouldAutoUnpause = pausedAgoMs !== null && pausedAgoMs > AUTO_UNPAUSE_MS

    if (shouldAutoUnpause) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { aiPaused: false, pausedAt: null },
      })
      log('step:9 ai_pause_check', 'PASS', { action: 'auto_unpaused', pausedAgoMin: Math.round((pausedAgoMs ?? 0) / 60000) })
    } else {
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
            nextFollowUpAt: null,
            followUpCount: 0,
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

      log('step:9 ai_pause_check', 'EXIT', { reason: 'ai_paused', conversationId, pausedAgoMin: Math.round((pausedAgoMs ?? 0) / 60000), ms: Date.now() - t0 })
      return NextResponse.json({ success: true, reason: 'ai_paused_message_saved' })
    }
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
      data: { unreadCount: { increment: 1 }, nextFollowUpAt: null, followUpCount: 0 },
    }),
    redis
      .set(
        `debounce:${conversationId}`,
        String(debounceTimestamp),
        'EX',
        agent.debounceSeconds + 1,
      )
      .catch((error) => {
        console.warn('[webhook] Redis debounce set failed:', { msgId: messageId, error })
      }),
    tasks.trigger<typeof processAgentMessage>(
      'process-agent-message',
      {
        message: normalizedMessage,
        agentId: agent.id,
        conversationId,
        organizationId: orgId,
        debounceTimestamp,
      },
      { delay: `${agent.debounceSeconds}s` },
    ),
    // "Digitando..." imediato — usuário vê feedback antes do debounce expirar
    sendPresence(instanceName, remoteJid, 'composing'),
  ])

  // Invalidar cache do inbox
  revalidateTag(`conversations:${orgId}`)
  revalidateTag(`conversation-messages:${conversationId}`)

  log('step:10 dispatched', 'PASS', {
    conversationId,
    inboxId: inbox.id,
    agentId: agent.id,
    debounceSeconds: agent.debounceSeconds,
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

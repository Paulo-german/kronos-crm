import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { parseEvolutionMessage, isGroupMessage, resolveEffectiveJid } from '@/_lib/evolution/parse-message'
import { resolveConversation } from '@/_lib/evolution/resolve-conversation'
import { sendWhatsAppMessage } from '@/_lib/evolution/send-message'
import { checkBusinessHours } from '@/_lib/agent/check-business-hours'
import { tasks } from '@trigger.dev/sdk/v3'
import type { processAgentMessage } from '@/../../trigger/process-agent-message'
import type { EvolutionWebhookPayload, NormalizedWhatsAppMessage } from '@/_lib/evolution/types'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'

export async function POST(req: Request) {
  const t0 = Date.now()
  const timings: Record<string, number> = {}

  // 1. Validação de assinatura via query param
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.EVOLUTION_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload: EvolutionWebhookPayload = await req.json()

  console.log('[evolution-webhook] incoming payload', JSON.stringify(payload, null, 2))

  // 2. Filtro de evento — só processar messages.upsert
  if (payload.event !== 'messages.upsert') {
    return NextResponse.json({ ignored: true, reason: 'event_not_handled' })
  }

  const { data, instance: instanceName } = payload
  const { key } = data
  const { fromMe, id: messageId } = key

  // Resolver @lid → @s.whatsapp.net para consistência
  const remoteJid = resolveEffectiveJid(key.remoteJid, key.remoteJidAlt)

  // 3. Filtro de grupo
  if (isGroupMessage(remoteJid)) {
    console.log('[evolution-webhook] SKIP: group_message', { remoteJid })
    return NextResponse.json({ ignored: true, reason: 'group_message' })
  }

  // 4. Lookup da Inbox pela instância Evolution (com agent opcional para IA)
  const inbox = await db.inbox.findFirst({
    where: {
      evolutionInstanceName: instanceName,
    },
    select: {
      id: true,
      organizationId: true,
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
  timings.inboxLookup = Date.now() - t0

  if (!inbox) {
    console.log('[evolution-webhook] SKIP: no_inbox_found', { instanceName })
    return NextResponse.json({ ignored: true, reason: 'no_inbox_found' })
  }

  const agent = inbox.agent
  const orgId = inbox.organizationId

  // 5. Tratamento fromMe — salvar mensagem + pausar IA quando humano responde
  if (fromMe) {
    const normalizedMsg = parseEvolutionMessage(data, instanceName)

    // Só salvar se tem conteúdo (ignorar status, reactions, etc.)
    if (normalizedMsg.type === 'text' && !normalizedMsg.text) {
      return NextResponse.json({ ignored: true, reason: 'from_me_empty' })
    }

    const resolveResult = await resolveConversation(
      inbox.id,
      orgId,
      remoteJid,
      normalizedMsg.phoneNumber,
      normalizedMsg.pushName,
    )

    // Dedup para não duplicar mensagens já salvas pelo inbox/agent
    const dedupResult = await redis
      .set(`dedup:${messageId}`, '1', 'EX', 300, 'NX')
      .catch(() => 'redis_error' as const)

    if (dedupResult !== null) {
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

      revalidateTag(`conversations:${orgId}`)
      revalidateTag(`conversation-messages:${resolveResult.conversationId}`)
    }

    await db.conversation.updateMany({
      where: { inboxId: inbox.id, remoteJid },
      data: { aiPaused: true, pausedAt: new Date() },
    })

    console.log('[evolution-webhook] from_me: saved + paused', { remoteJid, inboxId: inbox.id })
    return NextResponse.json({ success: true, reason: 'from_me_saved' })
  }

  // 6. Agente ausente ou desativado — salvar mensagem mas não processar com IA
  if (!agent || !agent.isActive) {
    const normalizedMsg = parseEvolutionMessage(data, instanceName)

    if (normalizedMsg.type === 'text' && !normalizedMsg.text) {
      return NextResponse.json({ ignored: true, reason: 'inactive_empty' })
    }

    const resolveResult = await resolveConversation(
      inbox.id,
      orgId,
      remoteJid,
      normalizedMsg.phoneNumber,
      normalizedMsg.pushName,
    )

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

      // Incrementar unreadCount
      await db.conversation.update({
        where: { id: resolveResult.conversationId },
        data: { unreadCount: { increment: 1 } },
      })

      revalidateTag(`conversations:${orgId}`)
      revalidateTag(`conversation-messages:${resolveResult.conversationId}`)
    }

    console.log('[evolution-webhook] no_agent_or_inactive: message saved, AI skipped', {
      remoteJid,
      inboxId: inbox.id,
    })
    return NextResponse.json({ success: true, reason: 'agent_inactive_message_saved' })
  }

  // 7. Business hours check — se fora do horário, salva mensagem mas não processa com IA
  if (agent.businessHoursEnabled && agent.businessHoursConfig) {
    const isOpen = checkBusinessHours(
      agent.businessHoursTimezone,
      agent.businessHoursConfig as BusinessHoursConfig,
    )

    if (!isOpen) {
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
      )

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

      // Incrementar unreadCount
      await db.conversation.update({
        where: { id: resolveResult.conversationId },
        data: { unreadCount: { increment: 1 } },
      })

      // Enviar auto-reply apenas se tem mensagem configurada e não enviou recentemente
      if (agent.outOfHoursMessage && alreadyReplied !== null) {
        await sendWhatsAppMessage(instanceName, remoteJid, agent.outOfHoursMessage).catch(
          (error) => console.error('[evolution-webhook] OOH auto-reply failed:', error),
        )
      }

      console.log('[evolution-webhook] SKIP: outside_business_hours', {
        remoteJid,
        agentId: agent.id,
        replied: !!alreadyReplied && !!agent.outOfHoursMessage,
      })
      return NextResponse.json({ ignored: true, reason: 'outside_business_hours' })
    }
  }

  // 8. Normalizar mensagem (sync — antes do paralelo pois precisamos do resultado)
  const normalizedMessage = parseEvolutionMessage(data, instanceName)

  // Filtrar mensagens de texto vazio (mas aceitar audio, image, document)
  if (normalizedMessage.type === 'text' && !normalizedMessage.text) {
    console.log('[evolution-webhook] SKIP: empty_text')
    return NextResponse.json({ ignored: true, reason: 'empty_text' })
  }

  // 9. Dedup + Resolve Conversation em paralelo
  const t1 = Date.now()
  const [dedupResult, resolveResult] = await Promise.all([
    redis
      .set(`dedup:${messageId}`, '1', 'EX', 300, 'NX')
      .catch((error) => {
        console.warn('[evolution-webhook] Redis dedup failed, continuing:', error)
        return 'redis_error' as const
      }),
    resolveConversation(
      inbox.id,
      orgId,
      remoteJid,
      normalizedMessage.phoneNumber,
      normalizedMessage.pushName,
    ),
  ])
  timings.dedupAndResolve = Date.now() - t1

  // Checar dedup — se duplicata, retornar early
  if (dedupResult === null) {
    console.log('[evolution-webhook] SKIP: duplicate', { messageId })
    return NextResponse.json({ ignored: true, reason: 'duplicate' })
  }

  const { conversationId } = resolveResult

  // 10. Verificar se IA está pausada na conversa (com auto-unpause após 30 min)
  const tPause = Date.now()
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { aiPaused: true, pausedAt: true },
  })
  timings.pauseCheck = Date.now() - tPause

  if (conversation?.aiPaused) {
    const AUTO_UNPAUSE_MS = 30 * 60 * 1000 // 30 minutos
    const shouldAutoUnpause =
      conversation.pausedAt &&
      Date.now() - conversation.pausedAt.getTime() > AUTO_UNPAUSE_MS

    if (shouldAutoUnpause) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { aiPaused: false, pausedAt: null },
      })
    } else {
      // IA pausada — salvar mensagem do cliente mas não processar com IA
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

      // Incrementar unreadCount
      await db.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: { increment: 1 } },
      })

      revalidateTag(`conversations:${orgId}`)
      revalidateTag(`conversation-messages:${conversationId}`)

      console.log('[evolution-webhook] ai_paused: message saved, AI skipped', { conversationId })
      return NextResponse.json({ success: true, reason: 'ai_paused_message_saved' })
    }
  }

  // 11. Save + Debounce + Dispatch em paralelo
  const debounceTimestamp = Date.now()
  const tDispatch = Date.now()

  await Promise.all([
    db.message.create({
      data: {
        conversationId,
        role: 'user',
        content: resolveMessageContent(normalizedMessage),
        providerMessageId: messageId,
        metadata: normalizedMessage.media
          ? ({ media: normalizedMessage.media } as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    }),
    // Incrementar unreadCount
    db.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: { increment: 1 } },
    }),
    redis
      .set(
        `debounce:${conversationId}`,
        String(debounceTimestamp),
        'EX',
        agent.debounceSeconds + 1,
      )
      .catch((error) => {
        console.warn('[evolution-webhook] Redis debounce set failed:', error)
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
  ])
  timings.saveAndDispatch = Date.now() - tDispatch

  // Invalidar cache do inbox
  revalidateTag(`conversations:${orgId}`)
  revalidateTag(`conversation-messages:${conversationId}`)

  console.log('[evolution-webhook] timings', {
    totalMs: Date.now() - t0,
    ...timings,
    conversationId,
    inboxId: inbox.id,
    agentId: agent.id,
  })

  return NextResponse.json({ success: true })
}

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

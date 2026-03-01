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
  // Evolution v2 global webhook não envia headers de autenticação,
  // então validamos pelo secret na URL: ?secret=xxx
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

  // 4. Lookup do Agent (inclui debounceSeconds para delay)
  const agent = await db.agent.findFirst({
    where: {
      evolutionInstanceName: instanceName,
      isActive: true,
    },
    select: {
      id: true,
      organizationId: true,
      debounceSeconds: true,
      businessHoursEnabled: true,
      businessHoursTimezone: true,
      businessHoursConfig: true,
      outOfHoursMessage: true,
    },
  })
  timings.agentLookup = Date.now() - t0

  if (!agent) {
    console.log('[evolution-webhook] SKIP: no_active_agent', { instanceName })
    return NextResponse.json({ ignored: true, reason: 'no_active_agent' })
  }

  // 5. Tratamento fromMe — salvar mensagem + pausar IA quando humano responde
  if (fromMe) {
    const normalizedMsg = parseEvolutionMessage(data, instanceName)

    // Só salvar se tem conteúdo (ignorar status, reactions, etc.)
    if (normalizedMsg.type === 'text' && !normalizedMsg.text) {
      return NextResponse.json({ ignored: true, reason: 'from_me_empty' })
    }

    const resolveResult = await resolveConversation(
      agent.id,
      agent.organizationId,
      remoteJid,
      normalizedMsg.phoneNumber,
      normalizedMsg.pushName,
    )

    // Dedup para não duplicar mensagens já salvas pelo inbox/agent
    const dedupResult = await redis
      .set(`dedup:${messageId}`, '1', 'EX', 300, 'NX')
      .catch(() => 'redis_error' as const)

    if (dedupResult !== null) {
      await db.agentMessage.create({
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

      revalidateTag(`conversations:${agent.organizationId}`)
      revalidateTag(`conversation-messages:${resolveResult.conversationId}`)
    }

    await db.agentConversation.updateMany({
      where: { agentId: agent.id, remoteJid },
      data: { aiPaused: true, pausedAt: new Date() },
    })

    console.log('[evolution-webhook] from_me: saved + paused', { remoteJid, agentId: agent.id })
    return NextResponse.json({ success: true, reason: 'from_me_saved' })
  }

  // 6. Business hours check — se fora do horário, salva mensagem mas não processa com IA
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
        agent.id,
        agent.organizationId,
        remoteJid,
        normalizedMsg.phoneNumber,
        normalizedMsg.pushName,
      )

      await db.agentMessage.create({
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

  // 7. Normalizar mensagem (sync — antes do paralelo pois precisamos do resultado)
  const normalizedMessage = parseEvolutionMessage(data, instanceName)

  // Filtrar mensagens de texto vazio (mas aceitar audio, image, document)
  if (normalizedMessage.type === 'text' && !normalizedMessage.text) {
    console.log('[evolution-webhook] SKIP: empty_text')
    return NextResponse.json({ ignored: true, reason: 'empty_text' })
  }

  // 8. Dedup + Resolve Conversation em paralelo
  const t1 = Date.now()
  const [dedupResult, resolveResult] = await Promise.all([
    redis
      .set(`dedup:${messageId}`, '1', 'EX', 300, 'NX')
      .catch((error) => {
        console.warn('[evolution-webhook] Redis dedup failed, continuing:', error)
        return 'redis_error' as const
      }),
    resolveConversation(
      agent.id,
      agent.organizationId,
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

  // 9. Verificar se IA está pausada na conversa (com auto-unpause após 30 min)
  const tPause = Date.now()
  const conversation = await db.agentConversation.findUnique({
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
      await db.agentConversation.update({
        where: { id: conversationId },
        data: { aiPaused: false, pausedAt: null },
      })
    } else {
      // IA pausada — salvar mensagem do cliente mas não processar com IA
      await db.agentMessage.create({
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

      revalidateTag(`conversations:${agent.organizationId}`)
      revalidateTag(`conversation-messages:${conversationId}`)

      console.log('[evolution-webhook] ai_paused: message saved, AI skipped', { conversationId })
      return NextResponse.json({ success: true, reason: 'ai_paused_message_saved' })
    }
  }

  // 10. Save + Debounce + Dispatch em paralelo
  const debounceTimestamp = Date.now()
  const tDispatch = Date.now()

  await Promise.all([
    db.agentMessage.create({
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
        organizationId: agent.organizationId,
        debounceTimestamp,
      },
      { delay: `${agent.debounceSeconds}s` },
    ),
  ])
  timings.saveAndDispatch = Date.now() - tDispatch

  // Invalidar cache do inbox
  revalidateTag(`conversations:${agent.organizationId}`)
  revalidateTag(`conversation-messages:${conversationId}`)

  console.log('[evolution-webhook] timings', {
    totalMs: Date.now() - t0,
    ...timings,
    conversationId,
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

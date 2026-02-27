import { NextResponse } from 'next/server'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { parseEvolutionMessage, isGroupMessage } from '@/_lib/evolution/parse-message'
import { resolveConversation } from '@/_lib/evolution/resolve-conversation'
import { tasks } from '@trigger.dev/sdk/v3'
import type { processAgentMessage } from '@/../../trigger/process-agent-message'
import type { EvolutionWebhookPayload } from '@/_lib/evolution/types'

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

  // 2. Filtro de evento — só processar messages.upsert
  if (payload.event !== 'messages.upsert') {
    return NextResponse.json({ ignored: true, reason: 'event_not_handled' })
  }

  const { data, instance: instanceName } = payload
  const { key } = data
  const { remoteJid, fromMe, id: messageId } = key

  // 3. Filtro de grupo
  if (isGroupMessage(remoteJid)) {
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
    },
  })
  timings.agentLookup = Date.now() - t0

  if (!agent) {
    return NextResponse.json({ ignored: true, reason: 'no_active_agent' })
  }

  // 5. Tratamento fromMe — pausar IA quando humano responde (com timestamp)
  if (fromMe) {
    await db.agentConversation.updateMany({
      where: { agentId: agent.id, remoteJid },
      data: { aiPaused: true, pausedAt: new Date() },
    })
    return NextResponse.json({ ignored: true, reason: 'from_me_paused' })
  }

  // 6. Normalizar mensagem (sync — antes do paralelo pois precisamos do resultado)
  const normalizedMessage = parseEvolutionMessage(data, instanceName)

  // Fase 3.1: só processar mensagens de texto
  if (normalizedMessage.type !== 'text' || !normalizedMessage.text) {
    return NextResponse.json({ ignored: true, reason: 'unsupported_type' })
  }

  // 7. Dedup + Resolve Conversation em paralelo
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
    return NextResponse.json({ ignored: true, reason: 'duplicate' })
  }

  const { conversationId } = resolveResult

  // 8. Verificar se IA está pausada na conversa (com auto-unpause após 30 min)
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
      // pausedAt null (dados legacy) ou ainda dentro do período — mantém pausado
      return NextResponse.json({ ignored: true, reason: 'ai_paused' })
    }
  }

  // 9. Save + Debounce + Dispatch em paralelo
  const debounceTimestamp = Date.now()
  const tDispatch = Date.now()

  await Promise.all([
    db.agentMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: normalizedMessage.text,
        providerMessageId: messageId,
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

  console.log('[evolution-webhook] timings', {
    totalMs: Date.now() - t0,
    ...timings,
    conversationId,
    agentId: agent.id,
  })

  return NextResponse.json({ success: true })
}

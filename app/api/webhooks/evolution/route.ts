import { NextResponse } from 'next/server'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { parseEvolutionMessage, isGroupMessage } from '@/_lib/evolution/parse-message'
import { resolveConversation } from '@/_lib/evolution/resolve-conversation'
import { tasks } from '@trigger.dev/sdk/v3'
import type { processAgentMessage } from '@/../../trigger/process-agent-message'
import type { EvolutionWebhookPayload } from '@/_lib/evolution/types'

export async function POST(req: Request) {
  // 1. Validação de assinatura (Evolution v2 envia no header "webhook-authorization")
  const webhookAuth = req.headers.get('webhook-authorization')
  if (webhookAuth !== process.env.EVOLUTION_WEBHOOK_SECRET) {
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

  if (!agent) {
    return NextResponse.json({ ignored: true, reason: 'no_active_agent' })
  }

  // 5. Tratamento fromMe — pausar IA quando humano responde
  if (fromMe) {
    await db.agentConversation.updateMany({
      where: { agentId: agent.id, remoteJid },
      data: { aiPaused: true },
    })
    return NextResponse.json({ ignored: true, reason: 'from_me_paused' })
  }

  // 6. Deduplicação Redis (best-effort — falha não bloqueia processamento)
  try {
    const dedupResult = await redis.set(`dedup:${messageId}`, '1', 'EX', 300, 'NX')
    if (dedupResult === null) {
      return NextResponse.json({ ignored: true, reason: 'duplicate' })
    }
  } catch (error) {
    console.warn('[evolution-webhook] Redis dedup failed, continuing:', error)
  }

  // 7. Normalizar mensagem
  const normalizedMessage = parseEvolutionMessage(data, instanceName)

  // Fase 3.1: só processar mensagens de texto
  if (normalizedMessage.type !== 'text' || !normalizedMessage.text) {
    return NextResponse.json({ ignored: true, reason: 'unsupported_type' })
  }

  // 8. Resolver conversa (buscar existente ou criar nova com contato)
  const { conversationId } = await resolveConversation(
    agent.id,
    agent.organizationId,
    remoteJid,
    normalizedMessage.phoneNumber,
    normalizedMessage.pushName,
  )

  // 9. Verificar se IA está pausada na conversa
  const conversation = await db.agentConversation.findUnique({
    where: { id: conversationId },
    select: { aiPaused: true },
  })

  if (conversation?.aiPaused) {
    return NextResponse.json({ ignored: true, reason: 'ai_paused' })
  }

  // 10. Salvar mensagem do usuário no banco ANTES do dispatch
  await db.agentMessage.create({
    data: {
      conversationId,
      role: 'user',
      content: normalizedMessage.text,
      providerMessageId: messageId,
    },
  })

  // 11. Debounce via Redis + delayed dispatch
  const debounceTimestamp = Date.now()
  const debounceKey = `debounce:${conversationId}`

  try {
    await redis.set(
      debounceKey,
      String(debounceTimestamp),
      'EX',
      agent.debounceSeconds + 1,
    )
  } catch (error) {
    console.warn('[evolution-webhook] Redis debounce set failed, continuing:', error)
  }

  // 12. Dispatch para Trigger.dev com delay (debounce natural)
  await tasks.trigger<typeof processAgentMessage>('process-agent-message', {
    message: normalizedMessage,
    agentId: agent.id,
    conversationId,
    organizationId: agent.organizationId,
    debounceTimestamp,
  }, {
    delay: `${agent.debounceSeconds}s`,
  })

  return NextResponse.json({ success: true })
}

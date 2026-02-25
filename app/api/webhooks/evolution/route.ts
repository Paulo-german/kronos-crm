import { NextResponse } from 'next/server'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { parseEvolutionMessage, isGroupMessage } from '@/_lib/evolution/parse-message'
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

  // 4. Lookup do Agent
  const agent = await db.agent.findFirst({
    where: {
      evolutionInstanceName: instanceName,
      isActive: true,
    },
    select: {
      id: true,
      organizationId: true,
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

  // 7. Lookup da conversa
  const conversation = await db.agentConversation.findFirst({
    where: { agentId: agent.id, remoteJid },
    select: { id: true, aiPaused: true },
  })

  if (conversation?.aiPaused) {
    return NextResponse.json({ ignored: true, reason: 'ai_paused' })
  }

  // 8. Dispatch para Trigger.dev
  const normalizedMessage = parseEvolutionMessage(data, instanceName)

  await tasks.trigger<typeof processAgentMessage>('process-agent-message', {
    message: normalizedMessage,
    agentId: agent.id,
    conversationId: conversation?.id ?? null,
    organizationId: agent.organizationId,
  })

  return NextResponse.json({ success: true })
}

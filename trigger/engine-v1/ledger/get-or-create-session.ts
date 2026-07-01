import type { AgentSession } from '@prisma/client'
import { db } from '@/_lib/prisma'

interface GetOrCreateSessionInput {
  agentId: string
  conversationId: string
  organizationId: string
}

// Carrega a sessão do motor (ledger) da conversa, criando-a lazy no 1º turno —
// sem backfill. Os turnos da mesma conversa são serializados por concurrencyKey
// (= conversationId), então não há corrida na criação.
export async function getOrCreateSession(
  input: GetOrCreateSessionInput,
): Promise<AgentSession> {
  const { agentId, conversationId, organizationId } = input

  const existing = await db.agentSession.findUnique({
    where: { conversationId },
  })
  if (existing) return existing

  // engine-v1 não herda estado de v1/v2: a sessão nasce do zero (currentStepOrder = 0,
  // via @default). Migrar um agente pra engine-v1 = recomeçar a conversa do zero.
  return db.agentSession.create({
    data: { organizationId, agentId, conversationId },
  })
}

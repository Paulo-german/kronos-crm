import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface AgentTestMessageDto {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  createdAt: Date
}

export interface AgentTestConversationDto {
  id: string
  agentId: string
  currentStepOrder: number
  summary: string | null
  messages: AgentTestMessageDto[]
}

// Consulta direta ao banco sem cache (chamada pela função principal cacheada)
const fetchTestConversationFromDb = async (
  agentId: string,
  userId: string,
): Promise<AgentTestConversationDto | null> => {
  const conversation = await db.agentTestConversation.findUnique({
    where: {
      agentId_userId: { agentId, userId },
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
    },
  })

  if (!conversation) return null

  return {
    id: conversation.id,
    agentId: conversation.agentId,
    currentStepOrder: conversation.currentStepOrder,
    summary: conversation.summary,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role as 'user' | 'assistant' | 'system' | 'tool',
      content: message.content,
      createdAt: message.createdAt,
    })),
  }
}

/**
 * Retorna a conversa de teste de um usuário para um agente específico.
 * Retorna null se ainda não existe (primeiro acesso).
 *
 * Cache tag: agent-test-chat:${agentId}:${userId}
 * Invalidada por: resetTestChat action e POST /api/agent/[agentId]/test-chat (onFinish)
 */
export const getAgentTestConversation = cache(
  async (
    agentId: string,
    userId: string,
  ): Promise<AgentTestConversationDto | null> => {
    const getCached = unstable_cache(
      async () => fetchTestConversationFromDb(agentId, userId),
      [`agent-test-conversation-${agentId}-${userId}`],
      {
        tags: [`agent-test-chat:${agentId}:${userId}`],
      },
    )

    return getCached()
  },
)

import 'server-only'
import { db } from '@/_lib/prisma'

export interface AgentConnectionStats {
  conversationsCount: number
  messagesToday: number
  lastMessageAt: Date | null
}

export async function getAgentConnectionStats(
  agentId: string,
): Promise<AgentConnectionStats> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [conversationsCount, messagesToday, lastMessage] = await Promise.all([
    db.agentConversation.count({
      where: { agentId },
    }),
    db.agentMessage.count({
      where: {
        conversation: { agentId },
        createdAt: { gte: todayStart },
      },
    }),
    db.agentMessage.findFirst({
      where: { conversation: { agentId } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ])

  return {
    conversationsCount,
    messagesToday,
    lastMessageAt: lastMessage?.createdAt ?? null,
  }
}

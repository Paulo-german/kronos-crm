import 'server-only'
import { db } from '@/_lib/prisma'

export interface AgentConnectionStats {
  conversationsCount: number
  messagesToday: number
  lastMessageAt: Date | null
}

export async function getAgentConnectionStats(
  inboxId: string,
): Promise<AgentConnectionStats> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [conversationsCount, messagesToday, lastMessage] = await Promise.all([
    db.conversation.count({
      where: { inboxId },
    }),
    db.message.count({
      where: {
        conversation: { inboxId },
        createdAt: { gte: todayStart },
      },
    }),
    db.message.findFirst({
      where: { conversation: { inboxId } },
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

import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface AgentConnectionStats {
  conversationsCount: number
  messagesToday: number
  lastMessageAt: Date | null
}

const fetchConnectionStatsFromDb = async (
  inboxId: string,
): Promise<AgentConnectionStats> => {
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

export const getAgentConnectionStats = cache(
  async (inboxId: string): Promise<AgentConnectionStats> => {
    const getCached = unstable_cache(
      async () => fetchConnectionStatsFromDb(inboxId),
      [`agent-connection-stats-${inboxId}`],
      { tags: [`inbox:${inboxId}`], revalidate: 300 },
    )

    return getCached()
  },
)

import { db } from '@/_lib/prisma'
import type { ConversationEventDto } from '@/_lib/conversation-events/types'

export async function getConversationEvents(
  conversationId: string,
): Promise<ConversationEventDto[]> {
  const rows = await db.conversationEvent.findMany({
    where: {
      conversationId,
      visibleToUser: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: {
      id: true,
      type: true,
      toolName: true,
      content: true,
      metadata: true,
      createdAt: true,
    },
  })

  return rows.map((row) => ({
    ...row,
    metadata: row.metadata as Record<string, unknown> | null,
  }))
}

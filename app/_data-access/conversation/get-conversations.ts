import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface ConversationListDto {
  id: string
  contactName: string
  contactPhone: string | null
  agentName: string
  agentId: string
  channel: string
  aiPaused: boolean
  remoteJid: string | null
  lastMessage: {
    content: string
    role: string
    createdAt: Date
    metadata: unknown
  } | null
  messageCount: number
  updatedAt: Date
}

const fetchConversationsFromDb = async (
  orgId: string,
): Promise<ConversationListDto[]> => {
  const conversations = await db.agentConversation.findMany({
    where: { organizationId: orgId },
    include: {
      contact: { select: { name: true, phone: true } },
      agent: { select: { name: true } },
      messages: {
        where: { isArchived: false },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true, role: true, createdAt: true, metadata: true },
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return conversations.map((conversation) => ({
    id: conversation.id,
    contactName: conversation.contact.name,
    contactPhone: conversation.contact.phone,
    agentName: conversation.agent.name,
    agentId: conversation.agentId,
    channel: conversation.channel,
    aiPaused: conversation.aiPaused,
    remoteJid: conversation.remoteJid,
    lastMessage: conversation.messages[0]
      ? {
          content: conversation.messages[0].content,
          role: conversation.messages[0].role,
          createdAt: conversation.messages[0].createdAt,
          metadata: conversation.messages[0].metadata,
        }
      : null,
    messageCount: conversation._count.messages,
    updatedAt: conversation.updatedAt,
  }))
}

export const getConversations = async (
  orgId: string,
): Promise<ConversationListDto[]> => {
  const getCached = unstable_cache(
    async () => fetchConversationsFromDb(orgId),
    [`conversations-${orgId}`],
    { tags: [`conversations:${orgId}`], revalidate: 30 },
  )

  return getCached()
}

import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface MessageDto {
  id: string
  role: string
  content: string
  metadata: unknown
  createdAt: Date
}

export interface ConversationDetailDto {
  id: string
  contactName: string
  contactPhone: string | null
  agentName: string
  agentId: string
  aiPaused: boolean
  remoteJid: string | null
  dealId: string | null
  summary: string | null
  organizationId: string
}

const fetchMessagesFromDb = async (
  conversationId: string,
): Promise<MessageDto[]> => {
  const messages = await db.agentMessage.findMany({
    where: {
      conversationId,
      role: { in: ['user', 'assistant'] },
      isArchived: false,
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
    select: {
      id: true,
      role: true,
      content: true,
      metadata: true,
      createdAt: true,
    },
  })

  return messages
}

export const getConversationMessages = async (
  conversationId: string,
): Promise<MessageDto[]> => {
  const getCached = unstable_cache(
    async () => fetchMessagesFromDb(conversationId),
    [`conversation-messages-${conversationId}`],
    { tags: [`conversation-messages:${conversationId}`], revalidate: 10 },
  )

  return getCached()
}

const fetchConversationDetailFromDb = async (
  conversationId: string,
  orgId: string,
): Promise<ConversationDetailDto | null> => {
  const conversation = await db.agentConversation.findFirst({
    where: { id: conversationId, organizationId: orgId },
    include: {
      contact: { select: { name: true, phone: true } },
      agent: { select: { name: true } },
    },
  })

  if (!conversation) return null

  return {
    id: conversation.id,
    contactName: conversation.contact.name,
    contactPhone: conversation.contact.phone,
    agentName: conversation.agent.name,
    agentId: conversation.agentId,
    aiPaused: conversation.aiPaused,
    remoteJid: conversation.remoteJid,
    dealId: conversation.dealId,
    summary: conversation.summary,
    organizationId: conversation.organizationId,
  }
}

export const getConversationDetail = async (
  conversationId: string,
  orgId: string,
): Promise<ConversationDetailDto | null> => {
  const getCached = unstable_cache(
    async () => fetchConversationDetailFromDb(conversationId, orgId),
    [`conversation-detail-${conversationId}`],
    { tags: [`conversations:${orgId}`, `conversation-messages:${conversationId}`], revalidate: 10 },
  )

  return getCached()
}

import 'server-only'
import { cache } from 'react'
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
  agentName: string | null
  inboxId: string
  inboxName: string
  aiPaused: boolean
  remoteJid: string | null
  dealId: string | null
  summary: string | null
  organizationId: string
}

const DEFAULT_MESSAGE_LIMIT = 30

const fetchMessagesFromDb = async (
  conversationId: string,
): Promise<MessageDto[]> => {
  const messages = await db.message.findMany({
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

export const getConversationMessages = cache(
  async (conversationId: string): Promise<MessageDto[]> => {
    const getCached = unstable_cache(
      async () => fetchMessagesFromDb(conversationId),
      [`conversation-messages-${conversationId}`],
      { tags: [`conversation-messages:${conversationId}`] },
    )
    return getCached()
  },
)

export interface PaginatedMessagesResult {
  messages: MessageDto[]
  hasMore: boolean
}

export async function getConversationMessagesPaginated(
  conversationId: string,
  limit = DEFAULT_MESSAGE_LIMIT,
  cursor?: string,
): Promise<PaginatedMessagesResult> {
  const messages = await db.message.findMany({
    where: {
      conversationId,
      role: { in: ['user', 'assistant'] },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor
      ? { cursor: { id: cursor }, skip: 1 }
      : {}),
    select: {
      id: true,
      role: true,
      content: true,
      metadata: true,
      createdAt: true,
    },
  })

  const hasMore = messages.length > limit
  const sliced = hasMore ? messages.slice(0, limit) : messages

  return {
    messages: sliced.reverse(),
    hasMore,
  }
}

const fetchConversationDetailFromDb = async (
  conversationId: string,
  orgId: string,
): Promise<ConversationDetailDto | null> => {
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, organizationId: orgId },
    include: {
      contact: { select: { name: true, phone: true } },
      inbox: {
        select: {
          id: true,
          name: true,
          agent: { select: { name: true } },
        },
      },
    },
  })

  if (!conversation) return null

  return {
    id: conversation.id,
    contactName: conversation.contact.name,
    contactPhone: conversation.contact.phone,
    agentName: conversation.inbox.agent?.name ?? null,
    inboxId: conversation.inboxId,
    inboxName: conversation.inbox.name,
    aiPaused: conversation.aiPaused,
    remoteJid: conversation.remoteJid,
    dealId: conversation.dealId,
    summary: conversation.summary,
    organizationId: conversation.organizationId,
  }
}

export const getConversationDetail = cache(
  async (
    conversationId: string,
    orgId: string,
  ): Promise<ConversationDetailDto | null> => {
    const getCached = unstable_cache(
      async () => fetchConversationDetailFromDb(conversationId, orgId),
      [`conversation-detail-${conversationId}`],
      { tags: [`conversation:${conversationId}`, `conversations:${orgId}`] },
    )
    return getCached()
  },
)

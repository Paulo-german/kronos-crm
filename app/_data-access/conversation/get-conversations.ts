import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'

export interface ConversationListDto {
  id: string
  contactId: string
  contactName: string
  contactPhone: string | null
  agentName: string | null
  inboxId: string
  inboxName: string
  channel: string
  aiPaused: boolean
  pausedAt: Date | null
  remoteJid: string | null
  dealId: string | null
  dealTitle: string | null
  unreadCount: number
  lastMessage: {
    content: string
    role: string
    createdAt: Date
    metadata: unknown
  } | null
  messageCount: number
  updatedAt: Date
}

export interface ConversationFilters {
  inboxId?: string
  unreadOnly?: boolean
  search?: string
}

export interface PaginatedConversationsResult {
  conversations: ConversationListDto[]
  hasMore: boolean
  totalCount: number
  totalUnread: number
}

const conversationListInclude = {
  contact: { select: { name: true, phone: true } },
  inbox: {
    select: {
      id: true,
      name: true,
      agent: { select: { name: true } },
    },
  },
  deal: { select: { id: true, title: true } },
  messages: {
    where: { isArchived: false },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { content: true, role: true, createdAt: true, metadata: true },
  },
  _count: { select: { messages: true } },
} satisfies Prisma.ConversationInclude

type ConversationWithIncludes = Prisma.ConversationGetPayload<{
  include: typeof conversationListInclude
}>

function mapConversationToDto(conversation: ConversationWithIncludes): ConversationListDto {
  return {
    id: conversation.id,
    contactId: conversation.contactId,
    contactName: conversation.contact.name,
    contactPhone: conversation.contact.phone,
    agentName: conversation.inbox.agent?.name ?? null,
    inboxId: conversation.inbox.id,
    inboxName: conversation.inbox.name,
    channel: conversation.channel,
    aiPaused: conversation.aiPaused,
    pausedAt: conversation.pausedAt,
    remoteJid: conversation.remoteJid,
    dealId: conversation.deal?.id ?? null,
    dealTitle: conversation.deal?.title ?? null,
    unreadCount: conversation.unreadCount,
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
  }
}

export async function getConversationAsDto(
  orgId: string,
  conversationId: string,
): Promise<ConversationListDto | null> {
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, organizationId: orgId },
    include: conversationListInclude,
  })
  if (!conversation) return null
  return mapConversationToDto(conversation)
}

async function fetchConversationsPaginatedFromDb(
  orgId: string,
  limit: number,
  cursor?: string,
  filters?: ConversationFilters,
): Promise<PaginatedConversationsResult> {
  const where: Prisma.ConversationWhereInput = {
    organizationId: orgId,
    ...(filters?.inboxId ? { inboxId: filters.inboxId } : {}),
    ...(filters?.unreadOnly ? { unreadCount: { gt: 0 } } : {}),
    ...(filters?.search
      ? {
          contact: {
            name: { contains: filters.search, mode: 'insensitive' },
          },
        }
      : {}),
  }

  const unreadWhere: Prisma.ConversationWhereInput = {
    organizationId: orgId,
    unreadCount: { gt: 0 },
    ...(filters?.inboxId ? { inboxId: filters.inboxId } : {}),
  }

  const [conversations, totalCount, totalUnread] = await Promise.all([
    db.conversation.findMany({
      where,
      take: limit + 1,
      ...(cursor
        ? { cursor: { id: cursor }, skip: 1 }
        : {}),
      orderBy: { updatedAt: 'desc' },
      include: conversationListInclude,
    }),
    db.conversation.count({ where }),
    db.conversation.count({ where: unreadWhere }),
  ])

  const hasMore = conversations.length > limit
  const sliced = hasMore ? conversations.slice(0, limit) : conversations
  const mapped = sliced.map(mapConversationToDto)

  return { conversations: mapped, hasMore, totalCount, totalUnread }
}

export const getConversationsPaginated = cache(
  async (
    orgId: string,
    limit = 20,
    cursor?: string,
    filters?: ConversationFilters,
  ): Promise<PaginatedConversationsResult> => {
    const filterKey = JSON.stringify(filters ?? {})
    const getCached = unstable_cache(
      async () => fetchConversationsPaginatedFromDb(orgId, limit, cursor, filters),
      [`conversations-${orgId}-${limit}-${cursor ?? 'none'}-${filterKey}`],
      { tags: [`conversations:${orgId}`] },
    )
    return getCached()
  },
)

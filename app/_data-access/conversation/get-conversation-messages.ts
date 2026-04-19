import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { maskPhone, maskRemoteJid } from '@/_lib/pii-mask'

// Whitelist explícita de campos de metadata expostos ao cliente.
// Campos internos (model, llmDurationMs, agentTrajectory) são filtrados aqui
// para nunca vazar estruturas de depuração para o frontend.
export interface MessageMetadataDto {
  media?: unknown
  sentBy?: string
  sentByName?: string
  sentFrom?: string
  template?: unknown
  deliveryError?: unknown
}

export interface MessageDto {
  id: string
  role: string
  content: string
  metadata: MessageMetadataDto | null
  deliveryStatus: string | null
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
  assignedTo: string | null
}

const DEFAULT_MESSAGE_LIMIT = 30

// Filtra metadata para expor apenas campos seguros ao frontend.
// Campos como model, llmDurationMs e agentTrajectory são internos e nunca devem
// chegar ao cliente — whitelist explícita protege contra adições futuras acidentais.
function toSafeMetadata(raw: unknown): MessageMetadataDto | null {
  if (raw === null || typeof raw !== 'object') return null
  const meta = raw as Record<string, unknown>
  return {
    media: meta.media,
    sentBy: typeof meta.sentBy === 'string' ? meta.sentBy : undefined,
    sentByName: typeof meta.sentByName === 'string' ? meta.sentByName : undefined,
    sentFrom: typeof meta.sentFrom === 'string' ? meta.sentFrom : undefined,
    template: meta.template,
    deliveryError: meta.deliveryError,
  }
}

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
      deliveryStatus: true,
      createdAt: true,
    },
  })

  return messages.map((msg) => ({
    ...msg,
    metadata: toSafeMetadata(msg.metadata),
  }))
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
      deliveryStatus: true,
      createdAt: true,
    },
  })

  const hasMore = messages.length > limit
  const sliced = hasMore ? messages.slice(0, limit) : messages

  return {
    messages: sliced.reverse().map((msg) => ({
      ...msg,
      metadata: toSafeMetadata(msg.metadata),
    })),
    hasMore,
  }
}

const fetchConversationDetailFromDb = async (
  conversationId: string,
  orgId: string,
  elevated: boolean,
  hidePiiFromMembers: boolean,
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

  const masked = !elevated && hidePiiFromMembers

  return {
    id: conversation.id,
    contactName: conversation.contact.name,
    contactPhone: masked ? maskPhone(conversation.contact.phone) : conversation.contact.phone,
    agentName: conversation.inbox.agent?.name ?? null,
    inboxId: conversation.inboxId,
    inboxName: conversation.inbox.name,
    aiPaused: conversation.aiPaused,
    remoteJid: masked ? maskRemoteJid(conversation.remoteJid) : conversation.remoteJid,
    dealId: conversation.dealId,
    summary: conversation.summary,
    organizationId: conversation.organizationId,
    assignedTo: conversation.assignedTo,
  }
}

export const getConversationDetail = cache(
  async (
    conversationId: string,
    orgId: string,
    elevated: boolean,
    hidePiiFromMembers: boolean,
  ): Promise<ConversationDetailDto | null> => {
    const getCached = unstable_cache(
      async () => fetchConversationDetailFromDb(conversationId, orgId, elevated, hidePiiFromMembers),
      [`conversation-detail-${conversationId}-${elevated}-${hidePiiFromMembers}`],
      { tags: [`conversation:${conversationId}`, `conversations:${orgId}`] },
    )
    return getCached()
  },
)

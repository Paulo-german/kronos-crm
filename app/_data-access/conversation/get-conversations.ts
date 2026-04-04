import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { Prisma, ConversationStatus } from '@prisma/client'
import { maskPhone, maskRemoteJid } from '@/_lib/pii-mask'

export interface ConversationLabelDto {
  id: string
  name: string
  color: string
}

export interface ConversationListDto {
  id: string
  contactId: string
  contactName: string
  contactPhone: string | null
  agentName: string | null
  // Campos para modo grupo (Multi-Agent Routing)
  agentGroupName: string | null
  activeAgentId: string | null
  activeAgentName: string | null
  inboxId: string
  inboxName: string
  inboxConnectionType: string
  channel: string
  aiPaused: boolean
  pausedAt: Date | null
  remoteJid: string | null
  dealId: string | null
  dealTitle: string | null
  lastCustomerMessageAt: Date | null
  unreadCount: number
  lastMessageRole: string | null
  lastMessage: {
    content: string
    role: string
    createdAt: Date
    metadata: unknown
  } | null
  messageCount: number
  updatedAt: Date
  assignedTo: string | null
  assigneeName: string | null
  assigneeAvatarUrl: string | null
  status: 'OPEN' | 'RESOLVED'
  resolvedAt: Date | null
  labels: ConversationLabelDto[]
}

export interface ConversationFilters {
  inboxId?: string
  unreadOnly?: boolean
  unansweredOnly?: boolean
  search?: string
  status?: 'OPEN' | 'RESOLVED'
  labelIds?: string[]
}

export interface PaginatedConversationsResult {
  conversations: ConversationListDto[]
  hasMore: boolean
  totalCount: number
  totalUnread: number
  totalUnanswered: number
}

const conversationListInclude = {
  contact: { select: { name: true, phone: true } },
  inbox: {
    select: {
      id: true,
      name: true,
      connectionType: true,
      agent: { select: { name: true } },
      // Grupo vinculado ao inbox (modo multi-agent)
      agentGroup: {
        select: {
          name: true,
          // Membros para resolver nome do worker ativo via activeAgentId
          members: {
            select: {
              agentId: true,
              agent: { select: { name: true } },
            },
          },
        },
      },
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
  assignee: { select: { fullName: true, avatarUrl: true } },
  labels: {
    select: {
      label: {
        select: { id: true, name: true, color: true },
      },
    },
  },
} satisfies Prisma.ConversationInclude

type ConversationWithIncludes = Prisma.ConversationGetPayload<{
  include: typeof conversationListInclude
}>

function mapConversationToDto(
  conversation: ConversationWithIncludes,
  masked: boolean,
): ConversationListDto {
  // Resolve nome do worker ativo via membros do grupo (sem FK explícita)
  const groupMembers = conversation.inbox.agentGroup?.members ?? []
  const activeAgentName =
    conversation.activeAgentId
      ? (groupMembers.find((member) => member.agentId === conversation.activeAgentId)?.agent.name ?? null)
      : null

  return {
    id: conversation.id,
    contactId: conversation.contactId,
    contactName: conversation.contact.name,
    contactPhone: masked ? maskPhone(conversation.contact.phone) : conversation.contact.phone,
    agentName: conversation.inbox.agent?.name ?? null,
    agentGroupName: conversation.inbox.agentGroup?.name ?? null,
    activeAgentId: conversation.activeAgentId,
    activeAgentName,
    inboxId: conversation.inbox.id,
    inboxName: conversation.inbox.name,
    inboxConnectionType: conversation.inbox.connectionType,
    channel: conversation.channel,
    aiPaused: conversation.aiPaused,
    pausedAt: conversation.pausedAt,
    remoteJid: masked ? maskRemoteJid(conversation.remoteJid) : conversation.remoteJid,
    dealId: conversation.deal?.id ?? null,
    dealTitle: conversation.deal?.title ?? null,
    lastCustomerMessageAt: conversation.lastCustomerMessageAt,
    unreadCount: conversation.unreadCount,
    lastMessageRole: conversation.lastMessageRole,
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
    assignedTo: conversation.assignedTo,
    assigneeName: conversation.assignee?.fullName ?? null,
    assigneeAvatarUrl: conversation.assignee?.avatarUrl ?? null,
    status: conversation.status,
    resolvedAt: conversation.resolvedAt,
    labels: conversation.labels.map((assignment) => ({
      id: assignment.label.id,
      name: assignment.label.name,
      color: assignment.label.color,
    })),
  }
}

export async function getConversationAsDto(
  orgId: string,
  conversationId: string,
  elevated: boolean,
  hidePiiFromMembers: boolean,
): Promise<ConversationListDto | null> {
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, organizationId: orgId },
    include: conversationListInclude,
  })
  if (!conversation) return null
  return mapConversationToDto(conversation, !elevated && hidePiiFromMembers)
}

async function fetchConversationsPaginatedFromDb(
  orgId: string,
  userId: string,
  elevated: boolean,
  hidePiiFromMembers: boolean,
  limit: number,
  cursor?: string,
  filters?: ConversationFilters,
): Promise<PaginatedConversationsResult> {
  // Filtro RBAC: MEMBER ve apenas conversas atribuidas a ele; ADMIN/OWNER ve tudo
  const rbacFilter: Prisma.ConversationWhereInput = elevated ? {} : { assignedTo: userId }
  const masked = !elevated && hidePiiFromMembers

  // Normaliza busca: remove espaços, parênteses, traços e '+' para comparar telefones
  const searchTerm = filters?.search?.trim() ?? ''
  const normalizedPhone = searchTerm
    ? searchTerm.replace(/[\s()\-+]/g, '')
    : ''

  // Filtro de status aplicado consistentemente a todas as queries
  const statusFilter: Prisma.ConversationWhereInput = filters?.status
    ? { status: filters.status as ConversationStatus }
    : {}

  const where: Prisma.ConversationWhereInput = {
    organizationId: orgId,
    ...rbacFilter,
    ...statusFilter,
    ...(filters?.inboxId ? { inboxId: filters.inboxId } : {}),
    ...(filters?.unreadOnly ? { unreadCount: { gt: 0 } } : {}),
    // unansweredOnly: última mensagem foi do cliente — candidata a resposta pendente
    ...(filters?.unansweredOnly ? { lastMessageRole: 'user' } : {}),
    // labelIds: AND — conversa deve ter TODAS as labels selecionadas
    ...(filters?.labelIds && filters.labelIds.length > 0
      ? {
          AND: filters.labelIds.map((labelId) => ({
            labels: { some: { labelId } },
          })),
        }
      : {}),
    // Quando masked: email e phone removidos da busca para não vazar PII
    ...(searchTerm
      ? {
          contact: {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' as const } },
              ...(!masked
                ? [
                    { email: { contains: searchTerm, mode: 'insensitive' as const } },
                    // Busca telefone com termo normalizado (sem formatação)
                    ...(normalizedPhone.length >= 3
                      ? [{ phone: { contains: normalizedPhone, mode: 'insensitive' as const } }]
                      : []),
                  ]
                : []),
              { company: { name: { contains: searchTerm, mode: 'insensitive' as const } } },
            ],
          },
        }
      : {}),
  }

  // Contadores de badge respeitam o mesmo filtro RBAC + status do usuario
  const unreadWhere: Prisma.ConversationWhereInput = {
    organizationId: orgId,
    ...rbacFilter,
    ...statusFilter,
    unreadCount: { gt: 0 },
    ...(filters?.inboxId ? { inboxId: filters.inboxId } : {}),
  }

  // Conta conversas cujo cliente enviou a última mensagem (candidatas a resposta pendente)
  const unansweredWhere: Prisma.ConversationWhereInput = {
    organizationId: orgId,
    ...rbacFilter,
    ...statusFilter,
    lastMessageRole: 'user',
    ...(filters?.inboxId ? { inboxId: filters.inboxId } : {}),
  }

  const [conversations, totalCount, totalUnread, totalUnanswered] = await Promise.all([
    db.conversation.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { updatedAt: 'desc' },
      include: conversationListInclude,
    }),
    db.conversation.count({ where }),
    db.conversation.count({ where: unreadWhere }),
    db.conversation.count({ where: unansweredWhere }),
  ])

  const hasMore = conversations.length > limit
  const sliced = hasMore ? conversations.slice(0, limit) : conversations
  const mapped = sliced.map((conv) => mapConversationToDto(conv, masked))

  return { conversations: mapped, hasMore, totalCount, totalUnread, totalUnanswered }
}

export const getConversationsPaginated = cache(
  async (
    orgId: string,
    userId: string,
    elevated: boolean,
    hidePiiFromMembers: boolean,
    limit = 20,
    cursor?: string,
    filters?: ConversationFilters,
  ): Promise<PaginatedConversationsResult> => {
    const filterKey = JSON.stringify(filters ?? {})
    const getCached = unstable_cache(
      async () => fetchConversationsPaginatedFromDb(orgId, userId, elevated, hidePiiFromMembers, limit, cursor, filters),
      // Cache key inclui userId para isolar entradas MEMBER vs ADMIN/OWNER, e hidePiiFromMembers para reagir a mudanças no toggle
      [`conversations-${orgId}-${userId}-${elevated}-${hidePiiFromMembers}-${limit}-${cursor ?? 'none'}-${filterKey}`],
      { tags: [`conversations:${orgId}`], revalidate: 3600 },
    )
    return getCached()
  },
)

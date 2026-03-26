import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface InboxListDto {
  id: string
  name: string
  channel: string
  isActive: boolean
  connectionType: string
  evolutionInstanceName: string | null
  evolutionConnected: boolean
  metaWabaId: string | null
  metaPhoneNumberId: string | null
  metaPhoneDisplay: string | null
  zapiInstanceId: string | null
  // NAO incluir tokens/secrets na listagem (seguranca — nunca expor ao cliente)
  agentId: string | null
  agentName: string | null
  conversationsCount: number
  createdAt: Date
}

const fetchInboxesFromDb = async (orgId: string): Promise<InboxListDto[]> => {
  const inboxes = await db.inbox.findMany({
    where: { organizationId: orgId },
    include: {
      agent: { select: { name: true } },
      _count: { select: { conversations: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return inboxes.map((inbox) => ({
    id: inbox.id,
    name: inbox.name,
    channel: inbox.channel,
    isActive: inbox.isActive,
    connectionType: inbox.connectionType,
    evolutionInstanceName: inbox.evolutionInstanceName,
    evolutionConnected: inbox.evolutionConnected,
    metaWabaId: inbox.metaWabaId,
    metaPhoneNumberId: inbox.metaPhoneNumberId,
    metaPhoneDisplay: inbox.metaPhoneDisplay,
    zapiInstanceId: inbox.zapiInstanceId,
    agentId: inbox.agentId,
    agentName: inbox.agent?.name ?? null,
    conversationsCount: inbox._count.conversations,
    createdAt: inbox.createdAt,
  }))
}

export const getInboxes = cache(async (orgId: string): Promise<InboxListDto[]> => {
  const getCached = unstable_cache(
    async () => fetchInboxesFromDb(orgId),
    [`inboxes-${orgId}`],
    { tags: [`inboxes:${orgId}`] },
  )

  return getCached()
})

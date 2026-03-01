import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface InboxDetailDto {
  id: string
  name: string
  channel: string
  isActive: boolean
  evolutionInstanceName: string | null
  evolutionInstanceId: string | null
  agentId: string | null
  agentName: string | null
  organizationId: string
  createdAt: Date
  updatedAt: Date
}

const fetchInboxByIdFromDb = async (
  inboxId: string,
  orgId: string,
): Promise<InboxDetailDto | null> => {
  const inbox = await db.inbox.findFirst({
    where: { id: inboxId, organizationId: orgId },
    include: {
      agent: { select: { name: true } },
    },
  })

  if (!inbox) return null

  return {
    id: inbox.id,
    name: inbox.name,
    channel: inbox.channel,
    isActive: inbox.isActive,
    evolutionInstanceName: inbox.evolutionInstanceName,
    evolutionInstanceId: inbox.evolutionInstanceId,
    agentId: inbox.agentId,
    agentName: inbox.agent?.name ?? null,
    organizationId: inbox.organizationId,
    createdAt: inbox.createdAt,
    updatedAt: inbox.updatedAt,
  }
}

export const getInboxById = cache(async (
  inboxId: string,
  orgId: string,
): Promise<InboxDetailDto | null> => {
  const getCached = unstable_cache(
    async () => fetchInboxByIdFromDb(inboxId, orgId),
    [`inbox-${inboxId}`],
    { tags: [`inbox:${inboxId}`, `inboxes:${orgId}`] },
  )

  return getCached()
})

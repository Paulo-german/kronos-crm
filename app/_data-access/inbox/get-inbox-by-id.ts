import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface InboxDetailDto {
  id: string
  name: string
  channel: string
  isActive: boolean
  connectionType: string
  evolutionInstanceName: string | null
  evolutionInstanceId: string | null
  metaWabaId: string | null
  metaPhoneNumberId: string | null
  metaPhoneDisplay: string | null
  zapiInstanceId: string | null
  zapiToken: string | null
  zapiClientToken: string | null
  agentId: string | null
  agentName: string | null
  autoCreateDeal: boolean
  pipelineId: string | null
  distributionUserIds: string[]
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
    connectionType: inbox.connectionType,
    evolutionInstanceName: inbox.evolutionInstanceName,
    evolutionInstanceId: inbox.evolutionInstanceId,
    metaWabaId: inbox.metaWabaId,
    metaPhoneNumberId: inbox.metaPhoneNumberId,
    metaPhoneDisplay: inbox.metaPhoneDisplay,
    zapiInstanceId: inbox.zapiInstanceId,
    zapiToken: inbox.zapiToken,
    zapiClientToken: inbox.zapiClientToken,
    agentId: inbox.agentId,
    agentName: inbox.agent?.name ?? null,
    autoCreateDeal: inbox.autoCreateDeal ?? true,
    pipelineId: inbox.pipelineId ?? null,
    distributionUserIds: inbox.distributionUserIds ?? [],
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

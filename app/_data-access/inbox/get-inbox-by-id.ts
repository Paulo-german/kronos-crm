import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { maskApiKey } from '@/_lib/secret-mask'

export interface InboxDetailDto {
  id: string
  name: string
  channel: string
  isActive: boolean
  connectionType: string
  evolutionInstanceName: string | null
  evolutionInstanceId: string | null
  evolutionConnected: boolean
  // Credenciais self-hosted (BYOI) — valores sensíveis nunca saem crus do servidor
  evolutionApiUrl: string | null
  evolutionApiKeyMasked: string | null
  hasEvolutionWebhookSecret: boolean
  metaWabaId: string | null
  metaPhoneNumberId: string | null
  metaPhoneDisplay: string | null
  metaIgUserId: string | null
  metaIgPageId: string | null
  metaIgUsername: string | null
  zapiInstanceId: string | null
  agentId: string | null
  agentName: string | null
  // Modo grupo (mutuamente exclusivo com agentId)
  agentGroupId: string | null
  agentGroupName: string | null
  autoCreateDeal: boolean
  showAttendantName: boolean
  pipelineId: string | null
  distributionUserIds: string[]
  squadId: string | null
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
      agentGroup: { select: { name: true } },
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
    evolutionConnected: inbox.evolutionConnected,
    evolutionApiUrl: inbox.evolutionApiUrl,
    evolutionApiKeyMasked: inbox.evolutionApiKey
      ? maskApiKey(inbox.evolutionApiKey)
      : null,
    hasEvolutionWebhookSecret: !!inbox.evolutionWebhookSecret,
    metaWabaId: inbox.metaWabaId,
    metaPhoneNumberId: inbox.metaPhoneNumberId,
    metaPhoneDisplay: inbox.metaPhoneDisplay,
    metaIgUserId: inbox.metaIgUserId,
    metaIgPageId: inbox.metaIgPageId,
    metaIgUsername: inbox.metaIgUsername,
    zapiInstanceId: inbox.zapiInstanceId,
    agentId: inbox.agentId,
    agentName: inbox.agent?.name ?? null,
    agentGroupId: inbox.agentGroupId,
    agentGroupName: inbox.agentGroup?.name ?? null,
    autoCreateDeal: inbox.autoCreateDeal ?? false,
    showAttendantName: inbox.showAttendantName,
    pipelineId: inbox.pipelineId ?? null,
    distributionUserIds: inbox.distributionUserIds ?? [],
    squadId: inbox.squadId ?? null,
    organizationId: inbox.organizationId,
    createdAt: inbox.createdAt,
    updatedAt: inbox.updatedAt,
  }
}

export const getInboxById = cache(
  async (inboxId: string, orgId: string): Promise<InboxDetailDto | null> => {
    const getCached = unstable_cache(
      async () => fetchInboxByIdFromDb(inboxId, orgId),
      [`inbox-${inboxId}`],
      { tags: [`inbox:${inboxId}`, `inboxes:${orgId}`] },
    )

    return getCached()
  },
)

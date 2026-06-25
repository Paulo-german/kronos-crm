import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { ConnectionType } from '@prisma/client'
import { BROADCAST_ELIGIBLE_WHERE } from '@/_lib/whatsapp/broadcast-eligibility'

export interface ProspectionChannel {
  id: string
  name: string
  connectionType: ConnectionType
  evolutionConnected: boolean
  metaPhoneNumberId: string | null
  zapiInstanceId: string | null
}

const fetchProspectionChannelsFromDb = async (
  orgId: string,
): Promise<ProspectionChannel[]> => {
  return db.inbox.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      channel: 'WHATSAPP',
      ...BROADCAST_ELIGIBLE_WHERE,
    },
    select: {
      id: true,
      name: true,
      connectionType: true,
      evolutionConnected: true,
      metaPhoneNumberId: true,
      zapiInstanceId: true,
    },
    orderBy: { name: 'asc' },
  })
}

/**
 * Canais de WhatsApp da área de Canais do Prospection: os elegíveis para disparo
 * (mesmo critério do disparo — todos menos o Evolution interno e o Simulador).
 * Cacheado com a tag `inboxes:${orgId}`, invalidada pelas actions de conexão.
 */
export const getProspectionChannels = async (
  orgId: string,
): Promise<ProspectionChannel[]> => {
  const getCached = unstable_cache(
    async () => fetchProspectionChannelsFromDb(orgId),
    [`prospection-channels-${orgId}`],
    { tags: [`inboxes:${orgId}`], revalidate: 3600 },
  )
  return getCached()
}

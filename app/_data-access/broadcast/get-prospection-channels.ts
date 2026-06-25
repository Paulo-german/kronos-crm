import 'server-only'
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

/**
 * Canais de WhatsApp da área de Canais do Prospection: os elegíveis para disparo
 * (mesmo critério do disparo — todos menos o Evolution interno e o Simulador).
 * Sem cache — é tela de gestão e precisa refletir uma conexão recém-feita na hora.
 */
export const getProspectionChannels = async (
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

import type { ConnectionType, Prisma } from '@prisma/client'

/**
 * Critério único de canal elegível para disparo em massa: apenas SELFHOSTED real.
 *
 * O `connectionType` sozinho não distingue interno de selfhosted no Evolution —
 * tanto a conexão pela infra da plataforma (QR) quanto o servidor próprio do
 * cliente são gravados como `EVOLUTION`. O que separa é ter servidor próprio
 * (`evolutionApiUrl` + `evolutionApiKey`). Evolution Go é sempre selfhosted.
 *
 * Elegível:
 *  - EVOLUTION_GO (sempre)
 *  - EVOLUTION / EVOLUTION_JS COM servidor próprio
 * Excluído: EVOLUTION interno (infra da plataforma), Meta Cloud, Z-API, Simulador.
 */

// Fragmento de where do Prisma — fonte da verdade da query de inboxes elegíveis.
export const BROADCAST_ELIGIBLE_WHERE: Prisma.InboxWhereInput = {
  OR: [
    { connectionType: 'EVOLUTION_GO' },
    {
      connectionType: { in: ['EVOLUTION', 'EVOLUTION_JS'] },
      evolutionApiUrl: { not: null },
      evolutionApiKey: { not: null },
    },
  ],
}

export interface BroadcastInboxEligibility {
  connectionType: ConnectionType
  evolutionApiUrl: string | null
  evolutionApiKey: string | null
}

// Mesma regra do where acima, para validar uma inbox já carregada (server action).
export function isInboxEligibleForBroadcast(
  inbox: BroadcastInboxEligibility,
): boolean {
  if (inbox.connectionType === 'EVOLUTION_GO') return true
  if (
    inbox.connectionType === 'EVOLUTION' ||
    inbox.connectionType === 'EVOLUTION_JS'
  ) {
    return Boolean(inbox.evolutionApiUrl && inbox.evolutionApiKey)
  }
  return false
}

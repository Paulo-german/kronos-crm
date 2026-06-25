import type { ConnectionType, Prisma } from '@prisma/client'

/**
 * Critério único de canal elegível para disparo em massa: TODO canal real,
 * EXCETO o Evolution interno da plataforma e o Simulador.
 *
 * - Meta Cloud, Z-API e Evolution Go disparam sempre.
 * - Evolution / Evolution JS disparam só com servidor próprio
 *   (`evolutionApiUrl` + `evolutionApiKey`); sem isso é o Evolution interno
 *   (infra compartilhada da plataforma), que NÃO pode disparar em massa.
 * - SIMULATOR e quaisquer tipos internos futuros ficam de fora por padrão.
 */

// Fragmento de where do Prisma — fonte da verdade da query de inboxes elegíveis.
export const BROADCAST_ELIGIBLE_WHERE: Prisma.InboxWhereInput = {
  OR: [
    { connectionType: { in: ['META_CLOUD', 'Z_API', 'EVOLUTION_GO'] } },
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
  if (
    inbox.connectionType === 'META_CLOUD' ||
    inbox.connectionType === 'Z_API' ||
    inbox.connectionType === 'EVOLUTION_GO'
  ) {
    return true
  }
  if (
    inbox.connectionType === 'EVOLUTION' ||
    inbox.connectionType === 'EVOLUTION_JS'
  ) {
    return Boolean(inbox.evolutionApiUrl && inbox.evolutionApiKey)
  }
  return false
}

import { getEvolutionGoInstanceStatus } from './instance-management'
import type { EvolutionGoCredentials } from './types'

// Cache curto para evitar health check HTTP em toda request de envio
const CONNECTION_CACHE_TTL_MS = 30_000
const connectionCache = new Map<string, { connected: boolean; expiresAt: number }>()

/**
 * Valida que a instância Evolution Go está conectada antes de enviar mensagens.
 * Lança erro explícito se desconectada — evita que mensagens sejam salvas como
 * "enviadas" quando na verdade não foram entregues.
 * Cache de 30s evita bombardear a API com health checks.
 */
export async function assertEvolutionGoConnected(
  instanceName: string,
  credentials: EvolutionGoCredentials,
): Promise<void> {
  const cached = connectionCache.get(instanceName)

  if (cached && Date.now() < cached.expiresAt) {
    if (!cached.connected) {
      throw new Error(
        'WhatsApp (Evolution Go) desconectado. Reconecte via QR Code antes de enviar mensagens.',
      )
    }
    return
  }

  const { state } = await getEvolutionGoInstanceStatus(instanceName, credentials)
  const connected = state === 'open'
  connectionCache.set(instanceName, {
    connected,
    expiresAt: Date.now() + CONNECTION_CACHE_TTL_MS,
  })

  if (!connected) {
    throw new Error(
      'WhatsApp (Evolution Go) desconectado. Reconecte via QR Code antes de enviar mensagens.',
    )
  }
}

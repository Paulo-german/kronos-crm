import { getEvolutionConnectionState } from './instance-management'
import type { EvolutionCredentials } from './resolve-credentials'

// Cache curto para evitar health check HTTP em toda request de envio
const CONNECTION_CACHE_TTL_MS = 30_000
const connectionCache = new Map<string, { connected: boolean; expiresAt: number }>()

/**
 * Valida que a instancia Evolution esta conectada antes de enviar mensagens.
 * Lanca erro explicito se desconectada — evita que mensagens sejam salvas
 * como "enviadas" quando na verdade nao foram entregues.
 * Usa cache de 30s para evitar bombardear a API com health checks.
 */
export async function assertEvolutionConnected(
  instanceName: string,
  credentials: EvolutionCredentials,
): Promise<void> {
  const cached = connectionCache.get(instanceName)

  if (cached && Date.now() < cached.expiresAt) {
    if (!cached.connected) {
      throw new Error(
        'WhatsApp desconectado. Reconecte o WhatsApp via QR Code antes de enviar mensagens.',
      )
    }
    return
  }

  const { state } = await getEvolutionConnectionState(instanceName, credentials)
  const connected = state === 'open'
  connectionCache.set(instanceName, {
    connected,
    expiresAt: Date.now() + CONNECTION_CACHE_TTL_MS,
  })

  if (!connected) {
    throw new Error(
      'WhatsApp desconectado. Reconecte o WhatsApp via QR Code antes de enviar mensagens.',
    )
  }
}

import { zapiGet } from './zapi-client'
import type { ZApiConfig } from './types'

export interface ZApiInstanceInfo {
  connected: boolean
  phone: string | null
  name: string | null
}

// Cache curto para evitar health check HTTP em toda request de envio
const CONNECTION_CACHE_TTL_MS = 30_000
const connectionCache = new Map<string, { connected: boolean; expiresAt: number }>()

/**
 * Valida que a instancia Z-API esta conectada antes de enviar mensagens.
 * Lanca erro explicito se desconectada — evita que mensagens sejam salvas
 * como "enviadas" quando na verdade nao foram entregues.
 * Usa cache de 30s para evitar bombardear a API com health checks.
 */
export async function assertZApiConnected(config: ZApiConfig): Promise<void> {
  const cacheKey = config.instanceId
  const cached = connectionCache.get(cacheKey)

  if (cached && Date.now() < cached.expiresAt) {
    if (!cached.connected) {
      throw new Error(
        'WhatsApp desconectado. Reconecte o WhatsApp na Z-API antes de enviar mensagens.',
      )
    }
    return
  }

  const status = await getZApiConnectionStatus(config)
  connectionCache.set(cacheKey, {
    connected: status.connected,
    expiresAt: Date.now() + CONNECTION_CACHE_TTL_MS,
  })

  if (!status.connected) {
    throw new Error(
      'WhatsApp desconectado. Reconecte o WhatsApp na Z-API antes de enviar mensagens.',
    )
  }
}

/**
 * Verifica status de conexao da instancia Z-API via GET /me.
 */
export async function getZApiConnectionStatus(
  config: ZApiConfig,
): Promise<ZApiInstanceInfo> {
  try {
    const response = await zapiGet(config, 'me')

    if (!response.ok) {
      return { connected: false, phone: null, name: null }
    }

    const data = await response.json()

    return {
      connected: data?.connected ?? false,
      phone: data?.phone ?? data?.connectedPhone ?? null,
      name: data?.name ?? data?.displayName ?? null,
    }
  } catch {
    return { connected: false, phone: null, name: null }
  }
}

export interface ZApiQRCodeResult {
  /** Imagem base64 do QR code */
  base64: string | null
  connected: boolean
}

/**
 * Busca QR code da instancia Z-API para escaneamento.
 * QR expira a cada ~20s — UI deve fazer polling a cada 15s.
 */
export async function getZApiQRCode(
  config: ZApiConfig,
): Promise<ZApiQRCodeResult> {
  // Primeiro checar se ja esta conectado
  const status = await getZApiConnectionStatus(config)
  if (status.connected) {
    return { base64: null, connected: true }
  }

  try {
    const response = await zapiGet(config, 'qr-code/image')

    if (!response.ok) {
      return { base64: null, connected: false }
    }

    const data = await response.json()
    const base64 = data?.value ?? data?.base64 ?? null

    return { base64, connected: false }
  } catch {
    return { base64: null, connected: false }
  }
}

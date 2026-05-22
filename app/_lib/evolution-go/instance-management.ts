import 'server-only'
import type { EvolutionGoCredentials } from './types'
import type {
  EvolutionGoConnectionState,
  EvolutionGoCreateInstanceResult,
  EvolutionGoInstanceInfo,
  EvolutionGoQRCodeResult,
} from './types-instance'

/**
 * Evolution Go — Gerenciamento de Instâncias WhatsApp.
 *
 * Endpoints (baseados na doc atual do Evolution Go):
 *   POST   /instance/create            { name, token, webhook?, webhookEvents? }
 *   POST   /instance/connect           { instanceName }       -> retorna QR base64
 *   GET    /instance/{name}/status     -> retorna { state }
 *   DELETE /instance/delete/:id        -> remove a instância
 *
 * Auth: header `apikey: <apiToken>` (mesmo padrão do JS — ajustar se a doc Go divergir).
 */

function buildHeaders(apiToken: string) {
  return {
    'Content-Type': 'application/json',
    apikey: apiToken,
  }
}

const PRODUCTION_URL = 'https://app.kronoshub.com.br'

export function resolveAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_URL
}

/**
 * Webhook URL para Evolution Go — sempre per-inbox (Go é selfhosted no MVP).
 */
export function buildEvolutionGoWebhookUrl(webhookSecret: string): string {
  const appUrl = resolveAppUrl()
  return `${appUrl}/api/webhooks/evolution-go?secret=${webhookSecret}`
}

/**
 * Cria uma instância no servidor Evolution Go.
 */
export async function createEvolutionGoInstance(
  instanceName: string,
  instanceToken: string,
  webhookUrl: string,
  credentials: EvolutionGoCredentials,
): Promise<EvolutionGoCreateInstanceResult> {
  const { apiUrl, apiToken } = credentials

  const response = await fetch(`${apiUrl}/instance/create`, {
    method: 'POST',
    headers: buildHeaders(apiToken),
    body: JSON.stringify({
      name: instanceName,
      token: instanceToken,
      webhook: webhookUrl,
      webhookEvents: ['MESSAGE', 'MESSAGE_STATUS', 'CONNECTION'],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Evolution Go create instance failed (${response.status}): ${errorBody}`,
    )
  }

  const createData = await response.json().catch(() => ({}))
  const instanceId =
    createData?.id ||
    createData?.instanceId ||
    createData?.instance?.id ||
    ''
  const qrBase64 =
    createData?.qrcode?.base64 ||
    createData?.base64 ||
    null

  return { instanceName, instanceId, qrBase64 }
}

/**
 * Conecta uma instância existente — retorna QR para pareamento.
 */
export async function connectEvolutionGoInstance(
  instanceName: string,
  credentials: EvolutionGoCredentials,
): Promise<EvolutionGoQRCodeResult> {
  const { apiUrl, apiToken } = credentials

  // Primeiro verifica o estado da conexão — se já conectado, não retorna QR
  const stateResult = await getEvolutionGoInstanceStatus(instanceName, credentials)
  if (stateResult.state === 'open') {
    return { base64: null, code: null, pairingCode: null, state: 'open' }
  }

  const response = await fetch(`${apiUrl}/instance/connect`, {
    method: 'POST',
    headers: buildHeaders(apiToken),
    body: JSON.stringify({ instanceName }),
  })

  if (!response.ok) {
    return { base64: null, code: null, pairingCode: null, state: 'close' }
  }

  const data = await response.json().catch(() => ({}))
  const base64 = data?.base64 || data?.qrcode?.base64 || null
  const code = data?.code || null
  const pairingCode = data?.pairingCode || null

  return { base64, code, pairingCode, state: 'connecting' }
}

/**
 * Status atual de uma instância — devolve apenas o connection state.
 */
export async function getEvolutionGoInstanceStatus(
  instanceName: string,
  credentials: EvolutionGoCredentials,
): Promise<EvolutionGoConnectionState> {
  const { apiUrl, apiToken } = credentials

  const response = await fetch(
    `${apiUrl}/instance/${encodeURIComponent(instanceName)}/status`,
    {
      method: 'GET',
      headers: buildHeaders(apiToken),
    },
  )

  if (response.status === 401 || response.status === 403) {
    throw new Error('Token inválido ou sem permissão no servidor Evolution Go.')
  }

  if (!response.ok) {
    return { state: 'close' }
  }

  const data = await response.json().catch(() => ({}))
  const state = data?.state || data?.instance?.state || 'close'
  return { state }
}

/**
 * Remove uma instância no servidor Evolution Go por ID.
 */
export async function deleteEvolutionGoInstance(
  instanceId: string,
  credentials: EvolutionGoCredentials,
): Promise<void> {
  const { apiUrl, apiToken } = credentials

  const response = await fetch(
    `${apiUrl}/instance/delete/${encodeURIComponent(instanceId)}`,
    {
      method: 'DELETE',
      headers: buildHeaders(apiToken),
    },
  )

  if (!response.ok && response.status !== 404) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Evolution Go delete instance failed (${response.status}): ${errorBody}`)
  }
}

/**
 * Best-effort: tenta obter info do dono da instância Go (perfil WhatsApp).
 * TODO: confirmar endpoint exato na doc do Evolution Go.
 */
export async function getEvolutionGoInstanceInfo(
  instanceName: string,
  credentials: EvolutionGoCredentials,
): Promise<EvolutionGoInstanceInfo | null> {
  const { apiUrl, apiToken } = credentials

  const response = await fetch(
    `${apiUrl}/instance/${encodeURIComponent(instanceName)}`,
    {
      method: 'GET',
      headers: buildHeaders(apiToken),
    },
  )

  if (!response.ok) return null

  const data = await response.json().catch(() => null)
  if (!data) return null

  return {
    ownerJid: data?.owner ?? data?.ownerJid ?? null,
    profileName: data?.profileName ?? null,
    profilePictureUrl: data?.profilePictureUrl ?? null,
  }
}

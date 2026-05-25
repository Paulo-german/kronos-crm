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
 * Normaliza o estado bruto retornado pelo servidor para os valores canônicos.
 * Evolution Go retorna: { data: { Connected: boolean, LoggedIn: boolean, Name: string }, message: "success" }
 */
function normalizeInstanceState(data: Record<string, unknown>): EvolutionGoConnectionState['state'] {
  const inner = data?.data as Record<string, unknown> | undefined

  // Formato real confirmado: { data: { Connected: boolean } }
  if (inner?.Connected === true) return 'open'
  if (inner?.Connected === false) return 'close'

  // Fallback para outros formatos possíveis (compatibilidade futura)
  const raw = (
    (inner?.state as string) ||
    (data?.state as string) ||
    (data?.status as string) ||
    ''
  ).toLowerCase().trim()

  if (raw === 'open' || raw === 'connected' || raw === 'online') return 'open'
  if (raw === 'connecting' || raw === 'qr' || raw === 'pairing') return 'connecting'
  return 'close'
}

/**
 * Status atual de uma instância.
 * Evolution Go: GET /instance/status — autenticação via apikey (= token da instância).
 * O token identifica a instância automaticamente, sem nome no path.
 * Retorna null se a instância não existir (404), lança em 401/403.
 */
export async function getEvolutionGoInstanceStatus(
  _instanceName: string,
  credentials: EvolutionGoCredentials,
): Promise<EvolutionGoConnectionState | null> {
  const { apiUrl, apiToken } = credentials

  const response = await fetch(`${apiUrl}/instance/status`, {
    method: 'GET',
    headers: buildHeaders(apiToken),
  })

  if (response.status === 401 || response.status === 403) {
    throw new Error('Token inválido ou sem permissão no servidor Evolution Go.')
  }

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    return { state: 'close' }
  }

  const data = await response.json().catch(() => ({})) as Record<string, unknown>
  return { state: normalizeInstanceState(data) }
}

/**
 * Polling de QR code — SOMENTE leitura (GET).
 * Não chama POST /connect. Use para o loop de polling após iniciar a conexão.
 * Quando GET /qr retorna 400 "session already logged in", verifica status novamente.
 */
export async function pollEvolutionGoQR(
  instanceName: string,
  credentials: EvolutionGoCredentials,
): Promise<EvolutionGoQRCodeResult> {
  const { apiUrl, apiToken } = credentials

  // 1. Verifica status — { data: { Connected: boolean } }
  const statusResult = await getEvolutionGoInstanceStatus(instanceName, credentials)
  if (statusResult?.state === 'open') {
    return { base64: null, code: null, pairingCode: null, state: 'open' }
  }

  // 2. Lê o QR atual (sem acionar reconexão)
  const qrResponse = await fetch(`${apiUrl}/instance/qr`, {
    method: 'GET',
    headers: buildHeaders(apiToken),
  })

  // 400 "session already logged in" — instância conectou entre o status check e o qr check
  if (qrResponse.status === 400) {
    const errData = await qrResponse.json().catch(() => ({})) as Record<string, unknown>
    const isLoggedIn =
      typeof errData?.error === 'string' &&
      errData.error.toLowerCase().includes('logged in')
    if (isLoggedIn) {
      return { base64: null, code: null, pairingCode: null, state: 'open' }
    }
    return { base64: null, code: null, pairingCode: null, state: 'connecting' }
  }

  if (!qrResponse.ok) {
    return { base64: null, code: null, pairingCode: null, state: 'connecting' }
  }

  const data = await qrResponse.json().catch(() => ({})) as Record<string, unknown>
  const inner = data?.data as Record<string, unknown> | undefined
  const base64 = (inner?.base64 as string) || (data?.base64 as string) || null
  const code = (inner?.code as string) || (data?.code as string) || (data?.qr as string) || null
  const pairingCode = (inner?.pairingCode as string) || (data?.pairingCode as string) || null

  return { base64, code, pairingCode, state: 'connecting' }
}

/**
 * Inicia a conexão de uma instância — dispara uma vez quando o usuário clica em conectar.
 * Chama POST /connect (seta webhook e eventos) e retorna o QR inicial.
 */
export async function connectEvolutionGoInstance(
  instanceName: string,
  credentials: EvolutionGoCredentials,
  webhookUrl?: string,
): Promise<EvolutionGoQRCodeResult> {
  const { apiUrl, apiToken } = credentials

  // 1. Verifica se já está conectado
  const stateResult = await getEvolutionGoInstanceStatus(instanceName, credentials)
  if (stateResult?.state === 'open') {
    return { base64: null, code: null, pairingCode: null, state: 'open' }
  }

  // 2. Dispara a conexão (seta webhook e inicia pareamento via QR)
  await fetch(`${apiUrl}/instance/connect`, {
    method: 'POST',
    headers: buildHeaders(apiToken),
    body: JSON.stringify({
      ...(webhookUrl ? { webhookUrl } : {}),
      subscribe: ['MESSAGE', 'MESSAGE_STATUS', 'CONNECTION'],
    }),
  }).catch(() => null)

  // 3. Lê o QR gerado
  const qrResponse = await fetch(`${apiUrl}/instance/qr`, {
    method: 'GET',
    headers: buildHeaders(apiToken),
  })

  if (!qrResponse.ok) {
    return { base64: null, code: null, pairingCode: null, state: 'connecting' }
  }

  const data = await qrResponse.json().catch(() => ({})) as Record<string, unknown>
  const inner = data?.data as Record<string, unknown> | undefined
  const base64 = (inner?.base64 as string) || (data?.base64 as string) || null
  const code = (inner?.code as string) || (data?.code as string) || (data?.qr as string) || null
  const pairingCode = (inner?.pairingCode as string) || (data?.pairingCode as string) || null

  return { base64, code, pairingCode, state: 'connecting' }
}

/**
 * Atualiza o webhook de uma instância existente.
 * Endpoint: POST /webhook/set/{instanceName}
 */
export async function updateEvolutionGoWebhook(
  instanceName: string,
  webhookUrl: string,
  credentials: EvolutionGoCredentials,
): Promise<void> {
  const { apiUrl, apiToken } = credentials

  const response = await fetch(
    `${apiUrl}/webhook/set/${encodeURIComponent(instanceName)}`,
    {
      method: 'POST',
      headers: buildHeaders(apiToken),
      body: JSON.stringify({
        webhook: {
          url: webhookUrl,
          events: ['MESSAGE', 'MESSAGE_STATUS', 'CONNECTION'],
          enabled: true,
        },
      }),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Evolution Go webhook update failed (${response.status}): ${errorBody}`,
    )
  }
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

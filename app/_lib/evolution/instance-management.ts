import 'server-only'

/**
 * Evolution API v2 – Gerenciamento de Instâncias WhatsApp
 * Reutiliza padrão de auth de send-message.ts (env vars + apikey header)
 */

function getEvolutionConfig() {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY

  if (!apiUrl || !apiKey) {
    throw new Error('EVOLUTION_API_URL and EVOLUTION_API_KEY must be configured')
  }

  return { apiUrl, apiKey }
}

function buildHeaders(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    apikey: apiKey,
  }
}

export interface CreateInstanceResult {
  instanceName: string
  instanceId: string
  qrBase64: string | null
}

export async function deleteEvolutionInstance(
  instanceName: string,
): Promise<void> {
  const { apiUrl, apiKey } = getEvolutionConfig()

  const response = await fetch(
    `${apiUrl}/instance/delete/${instanceName}`,
    {
      method: 'DELETE',
      headers: buildHeaders(apiKey),
    },
  )

  if (!response.ok && response.status !== 404) {
    const errorBody = await response.text().catch(() => 'unknown')
    console.error('[evolution] Delete instance failed:', {
      status: response.status,
      body: errorBody,
      instanceName,
    })
  }
}

async function doCreateInstance(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  webhookUrl: string,
): Promise<Response> {
  return fetch(`${apiUrl}/instance/create`, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: [
          'MESSAGES_UPSERT',
          'CONNECTION_UPDATE',
        ],
      },
    }),
  })
}

export async function createEvolutionInstance(
  instanceName: string,
  webhookUrl: string,
): Promise<CreateInstanceResult> {
  const { apiUrl, apiKey } = getEvolutionConfig()

  let createResponse = await doCreateInstance(apiUrl, apiKey, instanceName, webhookUrl)

  // Se a instância já existe (403 "already in use"), deleta a órfã e recria
  if (createResponse.status === 403) {
    const errorBody = await createResponse.text().catch(() => '')
    if (errorBody.includes('already in use')) {
      console.log('[evolution] Instance already exists, deleting orphan and retrying:', instanceName)
      await deleteEvolutionInstance(instanceName)
      createResponse = await doCreateInstance(apiUrl, apiKey, instanceName, webhookUrl)
    }
  }

  if (!createResponse.ok) {
    const errorBody = await createResponse.text().catch(() => 'unknown')
    console.error('[evolution] Create instance failed:', {
      status: createResponse.status,
      body: errorBody,
      instanceName,
    })
    throw new Error(
      `Evolution API create instance failed (${createResponse.status}): ${errorBody}`,
    )
  }

  const createData = await createResponse.json()
  console.log('[evolution] Create instance response:', JSON.stringify(createData, null, 2))

  // V2 retorna `hash` como token da instância
  const instanceId =
    createData?.hash ||
    createData?.instance?.instanceId ||
    createData?.instanceId ||
    ''

  // V2 retorna QR code na criação quando qrcode: true
  const qrBase64 =
    createData?.qrcode?.base64 ||
    createData?.base64 ||
    null

  return { instanceName, instanceId, qrBase64 }
}

export interface ConnectionState {
  state: 'open' | 'close' | 'connecting'
}

export async function getEvolutionConnectionState(
  instanceName: string,
): Promise<ConnectionState> {
  const { apiUrl, apiKey } = getEvolutionConfig()

  const response = await fetch(
    `${apiUrl}/instance/connectionState/${instanceName}`,
    {
      method: 'GET',
      headers: buildHeaders(apiKey),
    },
  )

  if (!response.ok) {
    return { state: 'close' }
  }

  const data = await response.json()
  return { state: data?.instance?.state || data?.state || 'close' }
}

export interface QRCodeResult {
  /** Imagem base64 do QR (data URI ou raw base64 PNG) */
  base64: string | null
  /** String de dados do QR para renderizar com lib client-side */
  code: string | null
  /** Código de pareamento para digitar manualmente */
  pairingCode: string | null
  state: 'open' | 'close' | 'connecting'
}

export async function getEvolutionQRCode(
  instanceName: string,
): Promise<QRCodeResult> {
  const { apiUrl, apiKey } = getEvolutionConfig()

  // Primeiro verifica o estado da conexão
  const stateResult = await getEvolutionConnectionState(instanceName)
  if (stateResult.state === 'open') {
    return { base64: null, code: null, pairingCode: null, state: 'open' }
  }

  // Busca QR code via connect endpoint
  const response = await fetch(
    `${apiUrl}/instance/connect/${instanceName}`,
    {
      method: 'GET',
      headers: buildHeaders(apiKey),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    console.error('[evolution] Connect/QR failed:', {
      status: response.status,
      body: errorBody,
      instanceName,
    })
    return { base64: null, code: null, pairingCode: null, state: 'close' }
  }

  const data = await response.json()
  console.log('[evolution] Connect/QR response keys:', Object.keys(data))

  // `base64` = imagem PNG pronta (pode vir como data URI ou raw)
  const base64 =
    data?.base64 ||
    data?.qrcode?.base64 ||
    null

  // `code` = string de dados do QR (para gerar imagem no client via qrcode.react)
  const code = data?.code || null

  return {
    base64,
    code,
    pairingCode: data?.pairingCode || null,
    state: 'connecting',
  }
}

export type { EvolutionInstanceInfo } from './types-instance'
import type { EvolutionInstanceInfo } from './types-instance'

export async function getEvolutionInstanceInfo(
  instanceName: string,
): Promise<EvolutionInstanceInfo | null> {
  const { apiUrl, apiKey } = getEvolutionConfig()

  const response = await fetch(
    `${apiUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
    {
      method: 'GET',
      headers: buildHeaders(apiKey),
    },
  )

  if (!response.ok) return null

  const data = await response.json()
  // A resposta pode ser um array ou objeto único
  const instance = Array.isArray(data) ? data[0] : data

  if (!instance) return null

  return {
    ownerJid: instance.instance?.owner ?? instance.owner ?? null,
    profileName: instance.instance?.profileName ?? instance.profileName ?? null,
    profilePictureUrl: instance.instance?.profilePictureUrl ?? instance.profilePictureUrl ?? null,
  }
}

export { formatPhoneFromJid } from './format-phone'

export async function disconnectEvolutionInstance(
  instanceName: string,
): Promise<void> {
  const { apiUrl, apiKey } = getEvolutionConfig()

  const response = await fetch(
    `${apiUrl}/instance/logout/${instanceName}`,
    {
      method: 'DELETE',
      headers: buildHeaders(apiKey),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Evolution API logout failed (${response.status}): ${errorBody}`,
    )
  }
}

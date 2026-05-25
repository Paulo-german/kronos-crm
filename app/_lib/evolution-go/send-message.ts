import { splitIntoParagraphs } from '@/_lib/whatsapp/chunk-text'
import { assertEvolutionGoConnected } from './connection-guard'
import type { EvolutionGoCredentials } from './types'

const MAX_WHATSAPP_MESSAGE_LENGTH = 4000
const DELAY_BETWEEN_CHUNKS_MS = 800

function buildHeaders(apiToken: string) {
  return { 'Content-Type': 'application/json', apikey: apiToken }
}

function extractMessageId(data: Record<string, unknown> | null): string | undefined {
  if (!data) return undefined
  // Tenta os paths mais comuns do Evolution Go
  return (
    (data?.id as string | undefined) ??
    (data?.data as Record<string, unknown> | undefined)?.id as string | undefined ??
    (data?.key as Record<string, unknown> | undefined)?.id as string | undefined
  )
}

export async function sendEvolutionGoMessage(
  instanceName: string,
  remoteJid: string,
  text: string,
  credentials: EvolutionGoCredentials,
  fetcher: typeof fetch = fetch,
): Promise<string[]> {
  const { apiUrl, apiToken } = credentials

  if (remoteJid.endsWith('@lid')) {
    throw new Error(
      'Não é possível enviar mensagem: o contato usa identificador temporário (@lid). Aguarde uma mensagem do contato para que o número real seja registrado.',
    )
  }

  await assertEvolutionGoConnected(instanceName, credentials)

  const chunks = splitIntoParagraphs(text, MAX_WHATSAPP_MESSAGE_LENGTH)
  const messageIds: string[] = []

  for (let index = 0; index < chunks.length; index++) {
    if (index > 0) {
      await sendEvolutionGoPresence(instanceName, remoteJid, 'composing', credentials)
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CHUNKS_MS))
    }

    const response = await fetcher(`${apiUrl}/send/text`, {
      method: 'POST',
      headers: buildHeaders(apiToken),
      body: JSON.stringify({
        number: remoteJid,
        text: chunks[index],
        formatJid: true,
        delay: 0,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      throw new Error(`Evolution Go sendText failed (${response.status}): ${errorBody}`)
    }

    const data = await response.json().catch(() => null)
    const messageId = extractMessageId(data)
    if (messageId) messageIds.push(messageId)
  }

  return messageIds
}

export async function sendEvolutionGoPresence(
  instanceName: string,
  remoteJid: string,
  presence: 'composing' | 'paused' = 'composing',
  credentials: EvolutionGoCredentials,
): Promise<void> {
  try {
    const { apiUrl, apiToken } = credentials

    await fetch(`${apiUrl}/send/presence`, {
      method: 'POST',
      headers: buildHeaders(apiToken),
      body: JSON.stringify({ number: remoteJid, presence }),
    })
  } catch {
    // Best-effort
  }
}

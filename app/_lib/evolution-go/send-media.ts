import { assertEvolutionGoConnected } from './connection-guard'
import { extractMessageId } from './send-message'
import type { EvolutionGoCredentials } from './types'

export async function sendEvolutionGoMedia(
  instanceName: string,
  remoteJid: string,
  mediaUrl: string,
  _mimetype: string,
  mediatype: 'image' | 'document' | 'video',
  fileName: string | undefined,
  caption: string | undefined,
  credentials: EvolutionGoCredentials,
): Promise<string> {
  const { apiUrl, apiToken } = credentials

  await assertEvolutionGoConnected(instanceName, credentials)

  const response = await fetch(`${apiUrl}/send/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiToken },
    body: JSON.stringify({
      number: remoteJid,
      type: mediatype,
      url: mediaUrl,
      caption: caption ?? '',
      filename: fileName ?? 'file',
      formatJid: true,
      delay: 0,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Evolution Go sendMedia failed (${response.status}): ${errorBody}`)
  }

  const data = await response.json().catch(() => null)
  const messageId = extractMessageId(data)
  if (!messageId) {
    console.warn('[evolution-go/send-media] messageId ausente na resposta', { rawResponse: JSON.stringify(data) })
  }
  return messageId ?? ''
}

import { assertEvolutionGoConnected } from './connection-guard'
import type { EvolutionGoCredentials } from './types'

export async function sendEvolutionGoMedia(
  instanceName: string,
  remoteJid: string,
  mediaUrl: string,
  mimetype: string,
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
      mediatype,
      media: mediaUrl,
      mimetype,
      caption: caption ?? '',
      fileName: fileName ?? 'file',
      formatJid: true,
      delay: 0,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Evolution Go sendMedia failed (${response.status}): ${errorBody}`)
  }

  const data = await response.json().catch(() => null)
  const messageId =
    (data?.id as string | undefined) ??
    (data?.data as Record<string, unknown> | undefined)?.id as string | undefined ??
    (data?.key as Record<string, unknown> | undefined)?.id as string | undefined

  if (!messageId) {
    throw new Error('Evolution Go sendMedia: no messageId returned')
  }

  return messageId
}

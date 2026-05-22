import { assertEvolutionGoConnected } from './connection-guard'
import type { EvolutionGoCredentials } from './types'

/**
 * Envia mídia (imagem, documento ou vídeo) via Evolution Go.
 * Endpoint assumido: POST /message/sendMedia
 * TODO: confirmar shape final do payload com a doc oficial Go.
 */
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

  const response = await fetch(`${apiUrl}/message/sendMedia`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiToken,
    },
    body: JSON.stringify({
      instanceName,
      number: remoteJid,
      mediatype,
      media: mediaUrl,
      mimetype,
      caption: caption ?? '',
      fileName: fileName ?? 'file',
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Evolution Go sendMedia failed (${response.status}): ${errorBody}`,
    )
  }

  const data = await response.json().catch(() => null)
  const messageId = data?.key?.id as string | undefined

  if (!messageId) {
    throw new Error('Evolution Go sendMedia: no messageId returned')
  }

  return messageId
}

import { assertEvolutionConnected } from './connection-guard'
import type { EvolutionCredentials } from './resolve-credentials'

/**
 * Envia mídia (imagem, documento ou video) via Evolution API REST.
 * Endpoint: POST /message/sendMedia/{instanceName}
 *
 * A Evolution API aceita URL pública no campo `media`.
 * Para arquivos grandes, enviar URL ao invés de base64.
 * O endpoint suporta natively os tres tipos: image, document e video.
 */
export async function sendWhatsAppMedia(
  instanceName: string,
  remoteJid: string,
  mediaSource: string,
  mimetype: string,
  mediatype: 'image' | 'document' | 'video',
  fileName: string | undefined,
  caption: string | undefined,
  credentials: EvolutionCredentials,
): Promise<string> {
  const { apiUrl, apiKey } = credentials

  await assertEvolutionConnected(instanceName, credentials)

  const response = await fetch(
    `${apiUrl}/message/sendMedia/${instanceName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: remoteJid,
        mediatype,
        media: mediaSource,
        mimetype,
        caption: caption ?? '',
        fileName: fileName ?? 'file',
      }),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Evolution API sendMedia failed (${response.status}): ${errorBody}`,
    )
  }

  const data = await response.json().catch(() => null)
  const messageId = data?.key?.id as string | undefined

  if (!messageId) {
    throw new Error('Evolution API sendMedia: no messageId returned')
  }

  return messageId
}

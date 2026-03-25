import { assertEvolutionConnected } from './connection-guard'

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
  fileName?: string,
  caption?: string,
): Promise<string> {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY

  if (!apiUrl || !apiKey) {
    throw new Error('EVOLUTION_API_URL and EVOLUTION_API_KEY must be configured')
  }

  await assertEvolutionConnected(instanceName)

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

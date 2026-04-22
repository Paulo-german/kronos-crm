import { describeImageWithVision } from './describe-image'

interface EvolutionBase64Response {
  mediaType: string
  mimetype: string
  base64: string
}

/**
 * Busca a imagem via Evolution API (getBase64FromMediaMessage) e descreve com gpt-4o-mini.
 *
 * Aceita opcionalmente o base64 já baixado (evita chamada dupla à Evolution API
 * quando downloadAndStoreMedia já foi executado antes).
 */
export async function transcribeImage(
  instanceName: string,
  messageId: string,
  caption?: string,
  preloadedBase64?: { base64: string; mimetype: string },
  credentials?: { apiUrl: string; apiKey: string },
): Promise<string> {
  if (preloadedBase64) {
    const result = await describeImageWithVision(preloadedBase64.base64, preloadedBase64.mimetype, caption)
    return result.text
  }

  const apiUrl = credentials?.apiUrl ?? process.env.EVOLUTION_API_URL
  const apiKey = credentials?.apiKey ?? process.env.EVOLUTION_API_KEY

  if (!apiUrl || !apiKey) {
    throw new Error('EVOLUTION_API_URL and EVOLUTION_API_KEY must be configured')
  }

  const response = await fetch(
    `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        message: {
          key: { id: messageId },
        },
      }),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Evolution getBase64FromMediaMessage failed (${response.status}): ${errorBody}`,
    )
  }

  const data: EvolutionBase64Response = await response.json()

  if (!data.base64) {
    throw new Error('Evolution returned empty base64 for image message')
  }

  const mimetype = data.mimetype ?? 'image/jpeg'

  const result = await describeImageWithVision(data.base64, mimetype, caption)
  return result.text
}

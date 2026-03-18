import type { MetaMediaInfoResponse } from './types'

/**
 * Baixa midia da Meta Graph API em dois passos:
 * 1. GET /{mediaId} -> retorna URL temporaria assinada
 * 2. GET {url} com Bearer token -> retorna binario da midia
 *
 * Usado no Trigger.dev para download de audio/imagem/documento.
 */
export async function downloadMetaMedia(mediaId: string, accessToken: string): Promise<Buffer> {
  const apiVersion = process.env.META_API_VERSION ?? 'v25.0'

  // Passo 1: Obter a URL temporaria da midia
  const infoResponse = await fetch(
    `https://graph.facebook.com/${apiVersion}/${mediaId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (!infoResponse.ok) {
    const errorBody = await infoResponse.text().catch(() => 'unknown')
    throw new Error(`Meta getMediaInfo failed (${infoResponse.status}): ${errorBody}`)
  }

  const infoData = (await infoResponse.json().catch(() => null)) as MetaMediaInfoResponse | null

  if (!infoData?.url) {
    throw new Error('Meta getMediaInfo: no URL in response')
  }

  // Passo 2: Baixar o binario da URL temporaria
  const downloadResponse = await fetch(infoData.url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!downloadResponse.ok) {
    const errorBody = await downloadResponse.text().catch(() => 'unknown')
    throw new Error(`Meta downloadMedia failed (${downloadResponse.status}): ${errorBody}`)
  }

  const arrayBuffer = await downloadResponse.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

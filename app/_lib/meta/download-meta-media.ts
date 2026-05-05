import type { MetaMediaInfoResponse } from './types'

interface MetaApiError {
  error?: {
    message?: string
    type?: string
    code?: number
    fbtrace_id?: string
  }
}

function parseMetaError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as MetaApiError
    const err = parsed?.error
    if (!err) return raw
    const parts = [`[${err.type ?? 'unknown'} ${err.code ?? '?'}]`, err.message]
    if (err.fbtrace_id) parts.push(`(trace: ${err.fbtrace_id})`)
    return parts.filter(Boolean).join(' ')
  } catch {
    return raw
  }
}

/**
 * Baixa midia da Meta Graph API em dois passos:
 * 1. GET /{mediaId} -> retorna URL temporaria assinada
 * 2. GET {url} com Bearer token -> retorna binario da midia
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
    const raw = await infoResponse.text().catch(() => 'unknown')
    throw new Error(`Meta getMediaInfo failed (${infoResponse.status}): ${parseMetaError(raw)}`)
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
    const raw = await downloadResponse.text().catch(() => 'unknown')
    throw new Error(`Meta downloadMedia failed (${downloadResponse.status}): ${parseMetaError(raw)}`)
  }

  const arrayBuffer = await downloadResponse.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

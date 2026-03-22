import { zapiPost } from './zapi-client'
import { assertZApiConnected } from './instance-info'
import type { ZApiConfig, ZApiSendResponse } from './types'

/**
 * Extrai extensao do fileName ou mimetype para o endpoint de documento da Z-API.
 * Ex: "relatorio.pdf" → "pdf", "application/pdf" → "pdf"
 */
function resolveExtension(fileName?: string, mimetype?: string): string {
  if (fileName) {
    const parts = fileName.split('.')
    if (parts.length > 1) return parts[parts.length - 1].toLowerCase()
  }

  if (mimetype) {
    const sub = mimetype.split('/')[1]
    if (sub) {
      // Tratar subtipos compostos: "vnd.openxmlformats-officedocument.spreadsheetml.sheet" → "xlsx"
      const mimeToExt: Record<string, string> = {
        'vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'vnd.ms-excel': 'xls',
        'msword': 'doc',
        'vnd.ms-powerpoint': 'ppt',
      }
      return mimeToExt[sub] ?? sub
    }
  }

  return 'bin'
}

/**
 * Envia midia (imagem ou documento) via Z-API.
 * - Imagem: POST /send-image — body: { phone, image, caption }
 * - Documento: POST /send-document/{ext} — body: { phone, document, fileName }
 *
 * Usamos URL publica do B2 (consistencia com Evolution).
 */
export async function sendZApiMedia(
  config: ZApiConfig,
  recipientPhone: string,
  mediaUrl: string,
  mimetype: string,
  mediatype: 'image' | 'document',
  fileName?: string,
  caption?: string,
): Promise<string> {
  await assertZApiConnected(config)

  let response: Response

  if (mediatype === 'image') {
    response = await zapiPost(config, 'send-image', {
      phone: recipientPhone,
      image: mediaUrl,
      caption: caption ?? '',
    })
  } else {
    const extension = resolveExtension(fileName, mimetype)
    response = await zapiPost(config, `send-document/${extension}`, {
      phone: recipientPhone,
      document: mediaUrl,
      fileName: fileName ?? 'file',
    })
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Z-API sendMedia failed (${response.status}): ${errorBody}`,
    )
  }

  const data: ZApiSendResponse = await response.json()

  if (!data.messageId) {
    throw new Error('Z-API sendMedia: no messageId returned')
  }

  return data.messageId
}

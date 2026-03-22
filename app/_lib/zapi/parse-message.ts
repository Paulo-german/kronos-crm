import type {
  NormalizedMediaInfo,
  NormalizedMessageType,
  NormalizedWhatsAppMessage,
} from '@/_lib/evolution/types'
import type { ZApiWebhookPayload } from './types'

/**
 * Normaliza payload do webhook Z-API para NormalizedWhatsAppMessage.
 * Z-API envia phone como numero puro (ex: "5511999999999").
 * Convertemos para remoteJid no formato @s.whatsapp.net para consistencia.
 */
export function parseZApiMessage(
  payload: ZApiWebhookPayload,
): NormalizedWhatsAppMessage {
  const { type, text, media } = extractContent(payload)

  const remoteJid = `${payload.phone}@s.whatsapp.net`

  return {
    messageId: payload.messageId,
    remoteJid,
    phoneNumber: payload.phone,
    pushName: payload.senderName || payload.chatName || null,
    fromMe: payload.fromMe,
    timestamp: payload.momment,
    type,
    text,
    media,
    instanceName: payload.instanceId,
    provider: 'z_api' as const,
  }
}

interface ExtractedContent {
  type: NormalizedMessageType
  text: string | null
  media: NormalizedMediaInfo | null
}

function extractContent(payload: ZApiWebhookPayload): ExtractedContent {
  if (payload.audio) {
    return {
      type: 'audio',
      text: null,
      media: {
        url: payload.audio.url,
        mimetype: payload.audio.mimeType,
        seconds: payload.audio.duration,
      },
    }
  }

  if (payload.image) {
    return {
      type: 'image',
      text: payload.image.caption ?? null,
      media: {
        url: payload.image.url,
        mimetype: payload.image.mimeType,
      },
    }
  }

  if (payload.document) {
    return {
      type: 'document',
      text: null,
      media: {
        url: payload.document.url,
        mimetype: payload.document.mimeType,
        fileName: payload.document.fileName ?? payload.document.title,
      },
    }
  }

  // Texto
  const textContent = payload.text?.message ?? null

  return { type: 'text', text: textContent, media: null }
}

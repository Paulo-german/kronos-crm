import type { MetaIncomingMessage, MetaWebhookContact } from './types'
import type { NormalizedWhatsAppMessage, NormalizedMediaInfo, NormalizedMessageType } from '@/_lib/evolution/types'

interface ExtractedContent {
  type: NormalizedMessageType
  text: string | null
  media: NormalizedMediaInfo | null
}

function extractMetaContent(message: MetaIncomingMessage): ExtractedContent {
  if (message.type === 'audio' && message.audio) {
    return {
      type: 'audio',
      text: null,
      media: {
        url: '', // Meta nao retorna URL direta — requer download separado via Media API
        mimetype: message.audio.mime_type,
      },
    }
  }

  if (message.type === 'image' && message.image) {
    return {
      type: 'image',
      text: message.image.caption ?? null,
      media: {
        url: '', // Meta nao retorna URL direta — requer download separado via Media API
        mimetype: message.image.mime_type,
      },
    }
  }

  if (message.type === 'document' && message.document) {
    return {
      type: 'document',
      text: message.document.caption ?? null,
      media: {
        url: '', // Meta nao retorna URL direta — requer download separado via Media API
        mimetype: message.document.mime_type,
        fileName: message.document.filename,
      },
    }
  }

  if (message.type === 'video' && message.video) {
    return {
      type: 'image', // Mapear video para image — tratamento similar no Trigger.dev
      text: message.video.caption ?? null,
      media: {
        url: '', // Meta nao retorna URL direta — requer download separado via Media API
        mimetype: message.video.mime_type,
      },
    }
  }

  // Tipos nao suportados (sticker, reaction, location, contacts) — logar e tratar como texto vazio
  if (['sticker', 'reaction', 'location', 'contacts'].includes(message.type)) {
    console.log(`[parse-meta-message] Unsupported message type ignored: ${message.type}`, { messageId: message.id })
  }

  // Texto simples
  const text = message.text?.body ?? null
  return { type: 'text', text, media: null }
}

/**
 * Normaliza payload de mensagem Meta para NormalizedWhatsAppMessage.
 * instanceName = phoneNumberId (identificador do sender no provider Meta).
 */
export function parseMetaMessage(
  message: MetaIncomingMessage,
  contact: MetaWebhookContact,
  phoneNumberId: string,
): NormalizedWhatsAppMessage {
  const { type, text, media } = extractMetaContent(message)

  // Para Meta, o remoteJid e o numero no formato internacional (sem @s.whatsapp.net)
  // Normalizar para formato @s.whatsapp.net para compatibilidade com o sistema
  const remoteJid = `${message.from}@s.whatsapp.net`
  const phoneNumber = message.from

  return {
    messageId: message.id,
    remoteJid,
    phoneNumber,
    pushName: contact.profile.name || null,
    fromMe: false, // Meta Cloud NAO envia mensagens fromMe no webhook de messages
    timestamp: Number(message.timestamp),
    type,
    text,
    media: media && (message.audio?.id || message.image?.id || message.document?.id || message.video?.id)
      ? {
          ...media,
          // Armazenar o mediaId Meta na URL para download posterior no Trigger.dev
          url: message.audio?.id ?? message.image?.id ?? message.document?.id ?? message.video?.id ?? '',
        }
      : media,
    instanceName: phoneNumberId,
    provider: 'meta_cloud',
  }
}

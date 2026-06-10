import type {
  NormalizedWhatsAppMessage,
  NormalizedMediaInfo,
  NormalizedMessageType,
} from '@/_lib/evolution-js/types'
import type {
  InstagramWebhookEntry,
  InstagramMessagingEvent,
  InstagramAttachment,
} from './types'

interface ExtractedContent {
  type: NormalizedMessageType
  text: string | null
  media: NormalizedMediaInfo | null
}

/** Tipos de attachment que devem ser ignorados — sem conteudo processavel pelo agente */
const UNSUPPORTED_ATTACHMENT_TYPES = new Set<InstagramAttachment['type']>([
  'story_mention',
  'share',
  'ig_reel',
])

function extractInstagramContent(
  text: string | undefined,
  attachments: InstagramAttachment[] | undefined,
): ExtractedContent | null {
  // Tentar extrair do primeiro attachment com URL publica
  if (attachments && attachments.length > 0) {
    const attachment = attachments[0]

    // Tipos ignorados — não disparar agente
    if (UNSUPPORTED_ATTACHMENT_TYPES.has(attachment.type)) {
      return null
    }

    const url = attachment.payload.url ?? ''

    if (attachment.type === 'audio') {
      return {
        type: 'audio',
        text: null,
        media: { url, mimetype: 'audio/ogg' },
      }
    }

    if (attachment.type === 'image') {
      return {
        type: 'image',
        text: text ?? null,
        media: { url, mimetype: 'image/jpeg' },
      }
    }

    if (attachment.type === 'video') {
      // Mapear video para image — tratamento similar no Trigger.dev
      return {
        type: 'image',
        text: text ?? null,
        media: { url, mimetype: 'video/mp4' },
      }
    }

    if (attachment.type === 'file') {
      return {
        type: 'document',
        text: text ?? null,
        media: { url, mimetype: 'application/octet-stream' },
      }
    }
  }

  // Texto simples
  return {
    type: 'text',
    text: text ?? null,
    media: null,
  }
}

/**
 * Normaliza payload de mensagem Instagram para NormalizedWhatsAppMessage.
 *
 * Retorna null quando o evento deve ser descartado:
 * - is_echo === true (mensagem enviada pela propria conta)
 * - is_deleted === true
 * - Attachment de tipo nao suportado (story_mention, share, ig_reel)
 * - Sem texto e sem attachments validos
 *
 * instanceName = igUserId (espelha uso de phoneNumberId no Meta WhatsApp).
 * remoteJid = ${psid}@instagram (espelha padrao @s.whatsapp.net).
 */
export function parseInstagramMessage(
  entry: InstagramWebhookEntry,
  messagingEvent: InstagramMessagingEvent,
): NormalizedWhatsAppMessage | null {
  const message = messagingEvent.message

  if (!message) {
    return null
  }

  // Ignorar ecos — mensagens enviadas pela propria conta aparecem no webhook com is_echo
  if (message.is_echo === true) {
    return null
  }

  if (message.is_deleted === true) {
    return null
  }

  const igUserId = entry.id
  const psid = messagingEvent.sender.id

  const extracted = extractInstagramContent(message.text, message.attachments)

  // Attachment de tipo nao suportado — descartar silenciosamente
  if (extracted === null) {
    // eslint-disable-next-line no-console
    console.log(
      '[parse-instagram-message] Unsupported attachment type ignored',
      {
        mid: message.mid,
        igUserId,
        psid,
        attachmentTypes: message.attachments?.map(
          (attachment) => attachment.type,
        ),
      },
    )
    return null
  }

  // Mensagem sem texto e sem midia — descartar
  if (extracted.type === 'text' && extracted.text === null) {
    return null
  }

  const remoteJid = `${psid}@instagram`

  return {
    messageId: message.mid,
    remoteJid,
    phoneNumber: psid,
    pushName: null, // Instagram nao envia nome no webhook — resolvido via Graph API se necessario
    fromMe: false,
    timestamp: messagingEvent.timestamp,
    type: extracted.type,
    text: extracted.text,
    media: extracted.media,
    instanceName: igUserId,
    provider: 'instagram_dm',
  }
}

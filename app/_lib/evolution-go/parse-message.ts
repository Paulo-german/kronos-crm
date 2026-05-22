import { resolveEffectiveJid, extractPhoneNumber } from '@/_lib/evolution-js/parse-message'
import type {
  NormalizedMediaInfo,
  NormalizedMessageType,
  NormalizedWhatsAppMessage,
} from '@/_lib/evolution-js/types'
import type { EvolutionGoMessageEvent } from './types'

/**
 * Normaliza um evento `MESSAGE` do Evolution Go para o shape genérico
 * consumido pelo dispatcher do Trigger.dev.
 *
 * Reutiliza `resolveEffectiveJid` (lógica @lid → @s.whatsapp.net) e
 * `extractPhoneNumber` do parser JS — são puramente baseados em string
 * e independentes do runtime.
 */
export function parseEvolutionGoMessage(
  data: EvolutionGoMessageEvent,
  instanceName: string,
): NormalizedWhatsAppMessage {
  const { key, pushName, message, messageTimestamp } = data

  const { type, text, media } = extractContent(message)
  const effectiveJid = resolveEffectiveJid(key.remoteJid, key.remoteJidAlt)

  return {
    messageId: key.id,
    remoteJid: effectiveJid,
    phoneNumber: extractPhoneNumber(effectiveJid),
    pushName: pushName ?? null,
    fromMe: key.fromMe,
    timestamp: messageTimestamp,
    type,
    text,
    media,
    instanceName,
    // TODO: ampliar union de `provider` em NormalizedWhatsAppMessage para incluir
    // 'evolution_go' explicitamente. Por hora reutilizamos 'evolution' (legacy) —
    // o dispatcher resolve o provider real via `connectionType` do Inbox.
    provider: 'evolution' as const,
  }
}

interface ExtractedContent {
  type: NormalizedMessageType
  text: string | null
  media: NormalizedMediaInfo | null
}

function extractContent(
  message: EvolutionGoMessageEvent['message'],
): ExtractedContent {
  if (message.audioMessage) {
    return {
      type: 'audio',
      text: null,
      media: {
        url: message.audioMessage.url,
        mimetype: message.audioMessage.mimetype,
        seconds: message.audioMessage.seconds,
      },
    }
  }

  if (message.imageMessage) {
    return {
      type: 'image',
      text: message.imageMessage.caption ?? null,
      media: {
        url: message.imageMessage.url,
        mimetype: message.imageMessage.mimetype,
      },
    }
  }

  if (message.documentMessage) {
    return {
      type: 'document',
      text: message.documentMessage.caption ?? null,
      media: {
        url: message.documentMessage.url,
        mimetype: message.documentMessage.mimetype,
        fileName: message.documentMessage.fileName,
      },
    }
  }

  const text =
    message.conversation ??
    message.extendedTextMessage?.text ??
    null

  return { type: 'text', text, media: null }
}

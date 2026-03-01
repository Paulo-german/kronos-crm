import type {
  EvolutionMessageData,
  NormalizedMediaInfo,
  NormalizedMessageType,
  NormalizedWhatsAppMessage,
} from './types'

export function parseEvolutionMessage(
  data: EvolutionMessageData,
  instanceName: string,
): NormalizedWhatsAppMessage {
  const { key, pushName, message, messageTimestamp } = data

  const { type, text, media } = extractContent(message)

  // Quando remoteJid é @lid (Linked ID), o número real vem em remoteJidAlt
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
  }
}

/**
 * Quando o remoteJid é @lid (Linked ID da Meta), usamos remoteJidAlt que contém
 * o número real no formato @s.whatsapp.net.
 */
export function resolveEffectiveJid(
  remoteJid: string,
  remoteJidAlt?: string,
): string {
  if (remoteJid.endsWith('@lid') && remoteJidAlt) {
    return remoteJidAlt
  }
  return remoteJid
}

export function isGroupMessage(remoteJid: string): boolean {
  return remoteJid.endsWith('@g.us')
}

export function extractPhoneNumber(remoteJid: string): string {
  return remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '')
}

interface ExtractedContent {
  type: NormalizedMessageType
  text: string | null
  media: NormalizedMediaInfo | null
}

function extractContent(
  message: EvolutionMessageData['message'],
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

  // Texto simples ou extendedTextMessage
  const text =
    message.conversation ??
    message.extendedTextMessage?.text ??
    null

  return { type: 'text', text, media: null }
}

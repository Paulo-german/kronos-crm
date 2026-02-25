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

  return {
    messageId: key.id,
    remoteJid: key.remoteJid,
    phoneNumber: extractPhoneNumber(key.remoteJid),
    pushName: pushName ?? null,
    fromMe: key.fromMe,
    timestamp: messageTimestamp,
    type,
    text,
    media,
    instanceName,
  }
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

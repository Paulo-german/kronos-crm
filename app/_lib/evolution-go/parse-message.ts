import { resolveEffectiveJid, extractPhoneNumber } from '@/_lib/evolution-js/parse-message'
import type {
  NormalizedMediaInfo,
  NormalizedMessageType,
  NormalizedWhatsAppMessage,
} from '@/_lib/evolution-js/types'
import type { EvolutionGoMessageEvent } from './types'

export function parseEvolutionGoMessage(
  data: EvolutionGoMessageEvent,
  instanceName: string,
): NormalizedWhatsAppMessage {
  const { Info, Message } = data

  const { type, text, media } = extractContent(Message)
  const effectiveJid = resolveEffectiveJid(Info.Chat, Info.Sender)

  const timestamp =
    typeof Info.Timestamp === 'number'
      ? Info.Timestamp
      : Info.Timestamp
        ? Math.floor(new Date(Info.Timestamp).getTime() / 1000)
        : Math.floor(Date.now() / 1000)

  return {
    messageId: Info.ID,
    remoteJid: effectiveJid,
    phoneNumber: extractPhoneNumber(effectiveJid),
    pushName: Info.PushName ?? null,
    fromMe: Info.IsFromMe,
    timestamp,
    type,
    text,
    media,
    instanceName,
    provider: 'evolution' as const,
  }
}

interface ExtractedContent {
  type: NormalizedMessageType
  text: string | null
  media: NormalizedMediaInfo | null
}

function extractContent(
  message: EvolutionGoMessageEvent['Message'],
): ExtractedContent {
  if (message.audioMessage) {
    return {
      type: 'audio',
      text: null,
      media: {
        url: message.audioMessage.url ?? '',
        mimetype: message.audioMessage.mimetype ?? 'audio/ogg',
        seconds: message.audioMessage.seconds,
      },
    }
  }

  if (message.imageMessage) {
    return {
      type: 'image',
      text: message.imageMessage.caption ?? null,
      media: {
        url: message.imageMessage.url ?? '',
        mimetype: message.imageMessage.mimetype ?? 'image/jpeg',
      },
    }
  }

  if (message.documentMessage) {
    return {
      type: 'document',
      text: message.documentMessage.caption ?? null,
      media: {
        url: message.documentMessage.url ?? '',
        mimetype: message.documentMessage.mimetype ?? 'application/octet-stream',
        fileName: message.documentMessage.fileName,
      },
    }
  }

  if (message.videoMessage) {
    return {
      type: 'video',
      text: message.videoMessage.caption ?? null,
      media: {
        url: message.videoMessage.url ?? '',
        mimetype: message.videoMessage.mimetype ?? 'video/mp4',
      },
    }
  }

  if (message.stickerMessage) {
    return {
      type: 'sticker',
      text: null,
      media: {
        url: message.stickerMessage.url ?? '',
        mimetype: message.stickerMessage.mimetype ?? 'image/webp',
      },
    }
  }

  const text =
    message.conversation ??
    message.extendedTextMessage?.text ??
    null

  return { type: 'text', text, media: null }
}

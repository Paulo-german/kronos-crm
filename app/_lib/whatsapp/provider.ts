import { sendWhatsAppMessage } from '@/_lib/evolution/send-message'
import { sendWhatsAppAudio } from '@/_lib/evolution/send-audio'
import { sendWhatsAppMedia } from '@/_lib/evolution/send-media'
import { sendMetaTextMessage, sendMetaAudioMessage, sendMetaMediaMessage } from '@/_lib/meta/send-meta-message'
import { ConnectionType } from '@prisma/client'

/**
 * Interface unificada de envio WhatsApp — usada por actions e Trigger.dev.
 * Abstrai diferencas entre Evolution API e Meta Cloud API.
 */
export interface WhatsAppProvider {
  sendText(recipientPhone: string, text: string): Promise<string[]>
  sendAudio(recipientPhone: string, audioBase64: string): Promise<string>
  sendMedia(
    recipientPhone: string,
    mediaBase64: string,
    mimetype: string,
    mediatype: 'image' | 'document',
    fileName?: string,
    caption?: string,
    mediaUrl?: string,
  ): Promise<string>
}

interface InboxProviderContext {
  connectionType: ConnectionType
  evolutionInstanceName: string | null
  metaPhoneNumberId: string | null
  metaAccessToken: string | null
}

/**
 * Retorna o provider correto com base no connectionType do Inbox.
 * Lanca erro se dados insuficientes para o provider selecionado.
 */
export function resolveWhatsAppProvider(inbox: InboxProviderContext): WhatsAppProvider {
  if (inbox.connectionType === 'META_CLOUD') {
    if (!inbox.metaPhoneNumberId || !inbox.metaAccessToken) {
      throw new Error(
        'Meta Cloud API nao configurada corretamente. Configure o phoneNumberId e accessToken.',
      )
    }

    const phoneNumberId = inbox.metaPhoneNumberId
    const accessToken = inbox.metaAccessToken

    return {
      // Strip do sufixo @s.whatsapp.net — Meta Graph API espera apenas o numero internacional
      sendText: (recipientPhone: string, text: string) =>
        sendMetaTextMessage(phoneNumberId, accessToken, recipientPhone.replace('@s.whatsapp.net', ''), text),
      sendAudio: (recipientPhone: string, audioBase64: string) =>
        sendMetaAudioMessage(phoneNumberId, accessToken, recipientPhone.replace('@s.whatsapp.net', ''), audioBase64),
      sendMedia: (recipientPhone: string, mediaBase64: string, mimetype: string, mediatype: 'image' | 'document', fileName?: string, caption?: string) =>
        sendMetaMediaMessage(phoneNumberId, accessToken, recipientPhone.replace('@s.whatsapp.net', ''), mediaBase64, mimetype, mediatype, fileName, caption),
    }
  }

  // Default: EVOLUTION
  if (!inbox.evolutionInstanceName) {
    throw new Error(
      'Evolution API nao configurada. Conecte o WhatsApp via QR Code.',
    )
  }

  const instanceName = inbox.evolutionInstanceName

  return {
    sendText: (recipientPhone: string, text: string) =>
      sendWhatsAppMessage(instanceName, recipientPhone, text),
    sendAudio: (recipientPhone: string, audioBase64: string) =>
      sendWhatsAppAudio(instanceName, recipientPhone, audioBase64),
    sendMedia: (recipientPhone: string, _mediaBase64: string, mimetype: string, mediatype: 'image' | 'document', fileName?: string, caption?: string, mediaUrl?: string) => {
      if (!mediaUrl) throw new Error('Evolution API requer URL pública para envio de mídia. Configure o B2 Storage.')
      return sendWhatsAppMedia(instanceName, recipientPhone, mediaUrl, mimetype, mediatype, fileName, caption)
    },
  }
}

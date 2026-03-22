import { sendWhatsAppMessage } from '@/_lib/evolution/send-message'
import { sendWhatsAppAudio } from '@/_lib/evolution/send-audio'
import { sendWhatsAppMedia } from '@/_lib/evolution/send-media'
import { sendMetaTextMessage, sendMetaAudioMessage, sendMetaMediaMessage } from '@/_lib/meta/send-meta-message'
import { sendZApiTextMessage } from '@/_lib/zapi/send-message'
import { sendZApiAudio } from '@/_lib/zapi/send-audio'
import { sendZApiMedia } from '@/_lib/zapi/send-media'
import type { ZApiConfig } from '@/_lib/zapi/types'
import { ConnectionType } from '@prisma/client'

/**
 * Interface unificada de envio WhatsApp — usada por actions e Trigger.dev.
 * Abstrai diferencas entre Evolution API, Meta Cloud API e Z-API.
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
  zapiInstanceId: string | null
  zapiToken: string | null
  zapiClientToken: string | null
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
      sendText: (recipientPhone: string, text: string) =>
        sendMetaTextMessage(phoneNumberId, accessToken, recipientPhone.replace('@s.whatsapp.net', ''), text),
      sendAudio: (recipientPhone: string, audioBase64: string) =>
        sendMetaAudioMessage(phoneNumberId, accessToken, recipientPhone.replace('@s.whatsapp.net', ''), audioBase64),
      sendMedia: (recipientPhone: string, mediaBase64: string, mimetype: string, mediatype: 'image' | 'document', fileName?: string, caption?: string) =>
        sendMetaMediaMessage(phoneNumberId, accessToken, recipientPhone.replace('@s.whatsapp.net', ''), mediaBase64, mimetype, mediatype, fileName, caption),
    }
  }

  if (inbox.connectionType === 'Z_API') {
    if (!inbox.zapiInstanceId || !inbox.zapiToken || !inbox.zapiClientToken) {
      throw new Error(
        'Z-API nao configurada corretamente. Configure o Instance ID, Token e Client-Token.',
      )
    }

    const config: ZApiConfig = {
      instanceId: inbox.zapiInstanceId,
      token: inbox.zapiToken,
      clientToken: inbox.zapiClientToken,
    }

    return {
      sendText: (recipientPhone: string, text: string) =>
        sendZApiTextMessage(config, recipientPhone.replace('@s.whatsapp.net', ''), text),
      sendAudio: (recipientPhone: string, audioBase64: string) =>
        sendZApiAudio(config, recipientPhone.replace('@s.whatsapp.net', ''), audioBase64),
      sendMedia: (recipientPhone: string, _mediaBase64: string, mimetype: string, mediatype: 'image' | 'document', fileName?: string, caption?: string, mediaUrl?: string) => {
        if (!mediaUrl) throw new Error('Z-API requer URL publica para envio de midia. Configure o B2 Storage.')
        return sendZApiMedia(config, recipientPhone.replace('@s.whatsapp.net', ''), mediaUrl, mimetype, mediatype, fileName, caption)
      },
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

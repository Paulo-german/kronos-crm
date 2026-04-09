import type { MetaSendMessageResponse } from './types'
import { splitIntoParagraphs } from '@/_lib/whatsapp/chunk-text'
import { assertMetaConnected } from './connection-guard'

const MAX_WHATSAPP_MESSAGE_LENGTH = 4000
const DELAY_BETWEEN_CHUNKS_MS = 800

function getGraphApiBaseUrl(): string {
  const version = process.env.META_API_VERSION ?? 'v25.0'
  return `https://graph.facebook.com/${version}`
}

/**
 * Envia mensagem de texto via WhatsApp Cloud API (Meta Graph API).
 * Quebra em paragrafos (\n\n) para simular conversa natural — mesmo comportamento da Evolution API.
 * Retorna array de wamid das mensagens enviadas.
 */
export async function sendMetaTextMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  text: string,
): Promise<string[]> {
  const baseUrl = getGraphApiBaseUrl()
  await assertMetaConnected(phoneNumberId, accessToken)

  const chunks = splitIntoParagraphs(text, MAX_WHATSAPP_MESSAGE_LENGTH)
  const messageIds: string[] = []

  for (let index = 0; index < chunks.length; index++) {
    // Delay entre chunks para simular digitacao natural
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CHUNKS_MS))
    }

    const response = await fetch(`${baseUrl}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'text',
        text: { body: chunks[index] },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      throw new Error(`Meta Graph API sendText failed (${response.status}): ${errorBody}`)
    }

    const data = (await response.json().catch(() => null)) as MetaSendMessageResponse | null
    const messageId = data?.messages?.[0]?.id
    if (messageId) messageIds.push(messageId)
  }

  return messageIds
}

/**
 * Envia mensagem de audio via WhatsApp Cloud API (Meta Graph API).
 * Diferente do texto, audio nao suporta chunking — enviado inteiro.
 * Retorna wamid da mensagem enviada.
 *
 * NOTA: Meta requer que o audio seja enviado via URL publica ou via Media Upload API.
 * Para o fluxo atual, assume-se que audioBase64 sera convertido em data URL.
 * Para producao, considerar upload via /media endpoint da Graph API.
 */
export async function sendMetaAudioMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  audioBase64: string,
): Promise<string> {
  const baseUrl = getGraphApiBaseUrl()
  await assertMetaConnected(phoneNumberId, accessToken)

  const audioMimeType = 'audio/ogg; codecs=opus'

  // Primeiro: fazer upload da midia para obter um media_id permanente
  const uploadResponse = await fetch(`${baseUrl}/${phoneNumberId}/media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: (() => {
      const formData = new FormData()
      // Converter base64 para Blob
      const binaryString = atob(audioBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: audioMimeType })
      formData.append('file', blob, 'audio.ogg')
      formData.append('messaging_product', 'whatsapp')
      formData.append('type', audioMimeType)
      return formData
    })(),
  })

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text().catch(() => 'unknown')
    throw new Error(`Meta Graph API media upload failed (${uploadResponse.status}): ${errorBody}`)
  }

  const uploadData = (await uploadResponse.json().catch(() => null)) as { id?: string } | null
  const mediaId = uploadData?.id

  if (!mediaId) {
    throw new Error('Meta Graph API media upload: no mediaId returned')
  }

  // Segundo: enviar mensagem de audio com o media_id
  const response = await fetch(`${baseUrl}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      type: 'audio',
      audio: { id: mediaId, ptt: true },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Meta Graph API sendAudio failed (${response.status}): ${errorBody}`)
  }

  const data = (await response.json().catch(() => null)) as MetaSendMessageResponse | null
  const messageId = data?.messages?.[0]?.id

  if (!messageId) {
    throw new Error('Meta Graph API sendAudio: no messageId returned')
  }

  return messageId
}

/**
 * Envia midia (imagem, documento ou video) via WhatsApp Cloud API (Meta Graph API).
 * Segue o mesmo padrao two-step de sendMetaAudioMessage:
 * 1. Upload do arquivo via /media endpoint
 * 2. Envio da mensagem com o media_id retornado
 *
 * Para video: o payload usa `type: 'video'` e o campo `video: { id, caption }`.
 */
export async function sendMetaMediaMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  mediaBase64: string,
  mimetype: string,
  mediatype: 'image' | 'document' | 'video',
  fileName?: string,
  caption?: string,
): Promise<string> {
  const baseUrl = getGraphApiBaseUrl()
  await assertMetaConnected(phoneNumberId, accessToken)

  // Passo 1: upload da midia para obter media_id
  const uploadResponse = await fetch(`${baseUrl}/${phoneNumberId}/media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: (() => {
      const formData = new FormData()
      const binaryString = atob(mediaBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let byteIndex = 0; byteIndex < binaryString.length; byteIndex++) {
        bytes[byteIndex] = binaryString.charCodeAt(byteIndex)
      }
      const blob = new Blob([bytes], { type: mimetype })
      formData.append('file', blob, fileName ?? 'file')
      formData.append('messaging_product', 'whatsapp')
      formData.append('type', mimetype)
      return formData
    })(),
  })

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text().catch(() => 'unknown')
    throw new Error(`Meta Graph API media upload failed (${uploadResponse.status}): ${errorBody}`)
  }

  const uploadData = (await uploadResponse.json().catch(() => null)) as { id?: string } | null
  const mediaId = uploadData?.id

  if (!mediaId) {
    throw new Error('Meta Graph API media upload: no mediaId returned')
  }

  // Passo 2: enviar mensagem com o media_id
  const messagePayload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: mediatype,
  }

  if (mediatype === 'image') {
    messagePayload.image = { id: mediaId, ...(caption ? { caption } : {}) }
  } else if (mediatype === 'video') {
    messagePayload.video = { id: mediaId, ...(caption ? { caption } : {}) }
  } else {
    messagePayload.document = {
      id: mediaId,
      ...(fileName ? { filename: fileName } : {}),
      ...(caption ? { caption } : {}),
    }
  }

  const response = await fetch(`${baseUrl}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(messagePayload),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Meta Graph API sendMedia failed (${response.status}): ${errorBody}`)
  }

  const data = (await response.json().catch(() => null)) as MetaSendMessageResponse | null
  const messageId = data?.messages?.[0]?.id

  if (!messageId) {
    throw new Error('Meta Graph API sendMedia: no messageId returned')
  }

  return messageId
}

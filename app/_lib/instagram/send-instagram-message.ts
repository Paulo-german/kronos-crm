import { IG_API_VERSION, IG_MAX_TEXT_LENGTH } from './constants'
import type { InstagramSendMessageResponse } from './types'

function getGraphApiBaseUrl(): string {
  return `https://graph.facebook.com/${IG_API_VERSION}`
}

interface SendInstagramTextOptions {
  /** Quando true, envia com messaging_type=MESSAGE_TAG + tag=HUMAN_AGENT (janela ate 7 dias) */
  humanAgentTag?: boolean
}

/**
 * Envia mensagem de texto via Instagram Messaging API.
 *
 * Sem chunking — Instagram nao tem o problema de "mensagem dentro de mensagem" do WhatsApp.
 * Limite de 1000 caracteres por mensagem; se exceder, lanca erro explícito.
 * Retorna array de 1 elemento para manter assinatura compatível com WhatsAppProvider.sendText.
 */
export async function sendInstagramText(
  igUserId: string,
  accessToken: string,
  recipientPsid: string,
  text: string,
  options?: SendInstagramTextOptions,
): Promise<string[]> {
  if (text.length > IG_MAX_TEXT_LENGTH) {
    throw new Error(
      `Mensagem Instagram excede ${IG_MAX_TEXT_LENGTH} caracteres. Reduza o texto antes de enviar.`,
    )
  }

  const useHumanAgent = options?.humanAgentTag === true
  const messagingType = useHumanAgent ? 'MESSAGE_TAG' : 'RESPONSE'

  const body: Record<string, unknown> = {
    recipient: { id: recipientPsid },
    message: { text },
    messaging_type: messagingType,
  }

  if (useHumanAgent) {
    body.tag = 'HUMAN_AGENT'
  }

  const response = await fetch(`${getGraphApiBaseUrl()}/${igUserId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Instagram API sendText failed (${response.status}): ${errorBody}`)
  }

  const data = (await response.json().catch(() => null)) as InstagramSendMessageResponse | null
  const messageId = data?.message_id

  if (!messageId) {
    throw new Error('Instagram API sendText: no message_id returned')
  }

  return [messageId]
}

/**
 * Envia audio via Instagram Messaging API.
 *
 * Instagram nao aceita base64 diretamente — necessario fazer upload ao B2 Storage
 * para obter URL publica antes do envio. Essa funcao recebe audioBase64 apenas para
 * manter a assinatura compatível com WhatsAppProvider.sendAudio.
 *
 * NOTA: O upload ao B2 deve ocorrer antes de chamar esta funcao. O caller (Trigger.dev)
 * e responsavel por passar a URL publica em vez do base64 bruto quando o canal e IG.
 * Enquanto o refactor nao acontece, fazemos o upload aqui mesmo para encapsular.
 */
export async function sendInstagramAudio(
  igUserId: string,
  accessToken: string,
  recipientPsid: string,
  audioBase64: string,
): Promise<string> {
  // Upload ao B2 para obter URL publica — Instagram nao aceita base64 direto
  const { uploadMediaToB2 } = await import('@/_lib/b2/storage')
  const messageId = `ig-audio-${Date.now()}`

  const { publicUrl } = await uploadMediaToB2({
    organizationId: igUserId,
    conversationId: recipientPsid,
    messageId,
    base64: audioBase64,
    mimetype: 'audio/ogg',
  })

  const body = {
    recipient: { id: recipientPsid },
    message: {
      attachment: {
        type: 'audio',
        payload: { url: publicUrl },
      },
    },
    messaging_type: 'RESPONSE',
  }

  const response = await fetch(`${getGraphApiBaseUrl()}/${igUserId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Instagram API sendAudio failed (${response.status}): ${errorBody}`)
  }

  const data = (await response.json().catch(() => null)) as InstagramSendMessageResponse | null
  const returnedMessageId = data?.message_id

  if (!returnedMessageId) {
    throw new Error('Instagram API sendAudio: no message_id returned')
  }

  return returnedMessageId
}

/**
 * Envia midia (imagem, video ou documento) via Instagram Messaging API.
 *
 * Instagram usa URL publica direta — diferente do WhatsApp que requer upload via media_id.
 * mediaUrl e obrigatorio; se ausente, o caller (WhatsAppProvider) ja lanca erro antes.
 */
export async function sendInstagramMedia(
  igUserId: string,
  accessToken: string,
  recipientPsid: string,
  mediaUrl: string,
  _mimetype: string,
  mediatype: 'image' | 'document' | 'video',
  caption?: string,
): Promise<string> {
  // Instagram Messaging API usa 'file' para documentos no campo attachment.type
  const attachmentType = mediatype === 'document' ? 'file' : mediatype

  const body = {
    recipient: { id: recipientPsid },
    message: {
      attachment: {
        type: attachmentType,
        payload: { url: mediaUrl },
      },
    },
    messaging_type: 'RESPONSE',
  }

  const response = await fetch(`${getGraphApiBaseUrl()}/${igUserId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Instagram API sendMedia failed (${response.status}): ${errorBody}`)
  }

  const data = (await response.json().catch(() => null)) as InstagramSendMessageResponse | null
  const messageId = data?.message_id

  if (!messageId) {
    throw new Error('Instagram API sendMedia: no message_id returned')
  }

  // Instagram nao suporta caption inline em midia — envia como mensagem de texto separada
  if (caption) {
    await sendInstagramText(igUserId, accessToken, recipientPsid, caption)
  }

  return messageId
}

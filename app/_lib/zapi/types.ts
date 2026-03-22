// -----------------------------------------------------------------------------
// Z-API Webhook & API Types
// -----------------------------------------------------------------------------

/**
 * Payload recebido nos webhooks da Z-API (on-message-received / on-message-send).
 * Nota: Z-API usa "momment" (com dois m) — typo da API deles.
 */
export interface ZApiWebhookPayload {
  type: string
  instanceId: string
  messageId: string
  phone: string
  fromMe: boolean
  momment: number
  chatName: string
  senderName: string
  senderPhone: string
  isGroup: boolean
  isStatusReply?: boolean
  isEdit?: boolean
  waitingMessage?: boolean
  text?: { message: string }
  image?: { url: string; mimeType: string; caption?: string }
  audio?: { url: string; mimeType: string; duration?: number }
  document?: { url: string; mimeType: string; fileName?: string; title?: string }
}

/** Resposta padrao de envio de mensagem da Z-API. */
export interface ZApiSendResponse {
  zaapId: string
  messageId: string
}

/** Credenciais per-inbox da Z-API (armazenadas no Inbox model). */
export interface ZApiConfig {
  instanceId: string
  token: string
  clientToken: string
}

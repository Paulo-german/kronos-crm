// -----------------------------------------------------------------------------
// Instagram Messaging API Webhook Types
// -----------------------------------------------------------------------------

export interface InstagramWebhookPayload {
  object: 'instagram'
  entry: InstagramWebhookEntry[]
}

export interface InstagramWebhookEntry {
  /** IG Business User ID — equivalente ao metaIgUserId do Inbox */
  id: string
  time: number
  /** Mensagens e eventos de leitura/entrega */
  messaging?: InstagramMessagingEvent[]
  /** Outros eventos (story_mentions, comments — fora de escopo) */
  changes?: InstagramChangeEvent[]
}

export interface InstagramMessagingEvent {
  /** PSID (Page-Scoped User ID) do remetente */
  sender: { id: string }
  /** IG User ID do destinatario (mesmo que entry.id) */
  recipient: { id: string }
  timestamp: number
  message?: InstagramIncomingMessage
  /** Evento de leitura (cliente visualizou) */
  read?: { mid: string }
  /** Evento de entrega */
  delivery?: { mids: string[]; watermark: number }
}

export interface InstagramIncomingMessage {
  mid: string
  text?: string
  attachments?: InstagramAttachment[]
  /** Mensagem enviada pela propria conta (eco do envio) — deve ser ignorada */
  is_echo?: boolean
  is_deleted?: boolean
  reply_to?: { mid: string }
}

export interface InstagramAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'share' | 'story_mention' | 'ig_reel'
  payload: { url?: string }
}

/** Evento de mudanca no webhook (story mentions, comments etc.) — fora de escopo atual */
export interface InstagramChangeEvent {
  field: string
  value: unknown
}

/** Resposta da Graph API ao enviar mensagem via Instagram */
export interface InstagramSendMessageResponse {
  recipient_id: string
  message_id: string
}

/** Resposta da Graph API ao buscar dados da conta Instagram */
export interface InstagramAccountResponse {
  id: string
  username?: string
  name?: string
}

// -----------------------------------------------------------------------------
// Meta WhatsApp Cloud API Webhook Types
// -----------------------------------------------------------------------------

export interface MetaWebhookEntry {
  id: string // WABA ID
  changes: MetaWebhookChange[]
}

export interface MetaWebhookChange {
  value: MetaWebhookValue
  field: string // "messages"
}

export interface MetaWebhookValue {
  messaging_product: string
  metadata: {
    display_phone_number: string
    phone_number_id: string
  }
  contacts?: MetaWebhookContact[]
  messages?: MetaIncomingMessage[]
  statuses?: MetaMessageStatus[]
}

export interface MetaWebhookContact {
  profile: { name: string }
  wa_id: string
}

export interface MetaIncomingMessage {
  from: string
  id: string // wamid.XXX
  timestamp: string
  type: 'text' | 'image' | 'audio' | 'document' | 'video' | 'reaction' | 'sticker' | 'location' | 'contacts'
  text?: { body: string }
  image?: { id: string; mime_type: string; sha256: string; caption?: string }
  audio?: { id: string; mime_type: string }
  document?: { id: string; mime_type: string; filename: string; caption?: string }
  video?: { id: string; mime_type: string; caption?: string }
}

export interface MetaMessageStatus {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
}

export interface MetaWebhookPayload {
  object: string // "whatsapp_business_account"
  entry: MetaWebhookEntry[]
}

export interface MetaSendMessageResponse {
  messaging_product: string
  contacts: Array<{ input: string; wa_id: string }>
  messages: Array<{ id: string }>
}

// Resposta da Graph API ao buscar informacoes de midia
export interface MetaMediaInfoResponse {
  url: string
  mime_type: string
  sha256: string
  file_size: number
  id: string
  messaging_product: string
}

// Resposta da Graph API ao buscar display_phone_number
export interface MetaPhoneNumberResponse {
  display_phone_number: string
  id: string
}

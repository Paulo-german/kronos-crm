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

export interface MetaMessageStatusError {
  code: number
  title: string
  message?: string
}

export interface MetaMessageStatus {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  errors?: MetaMessageStatusError[]
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

// -----------------------------------------------------------------------------
// Meta WhatsApp Message Templates
// -----------------------------------------------------------------------------

export interface MetaTemplateButton {
  type: 'PHONE_NUMBER' | 'URL' | 'QUICK_REPLY'
  text: string
  phoneNumber?: string
  url?: string
}

export interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
  /** Somente para HEADER */
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
  text?: string
  example?: {
    header_text?: string[]
    body_text?: string[][]
    header_handle?: string[]
  }
  buttons?: MetaTemplateButton[]
}

export interface MetaTemplate {
  id: string
  name: string
  language: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED' | 'IN_APPEAL'
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  quality_score?: {
    score: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'
    date?: string
  }
  components: MetaTemplateComponent[]
}

export interface MetaTemplateListResponse {
  data: MetaTemplate[]
  paging?: {
    cursors: { before: string; after: string }
    next?: string
  }
}

/** Payload de criação de template para a Graph API */
export interface CreateMetaTemplatePayload {
  name: string
  language: string
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  components: MetaTemplateComponent[]
}

/** Componente para envio de template message */
export interface MetaTemplateSendComponent {
  type: 'header' | 'body'
  parameters: Array<{ type: 'text'; text: string }>
}

export type MetaTemplateStatus = MetaTemplate['status']
export type MetaTemplateCategory = MetaTemplate['category']
export type MetaTemplateHeaderFormat = NonNullable<MetaTemplateComponent['format']>
export type MetaQualityScore = NonNullable<MetaTemplate['quality_score']>['score']

/** Credenciais Meta de um inbox — nunca expor ao client */
export interface InboxMetaCredentials {
  wabaId: string
  accessToken: string
  phoneNumberId: string
}

/** Webhook de atualizacao de status de template */
export interface MetaTemplateStatusUpdate {
  event: string
  message_template_id: number
  message_template_name: string
  message_template_language: string
  reason?: string
}

export interface MetaTemplateStatusWebhookEntry {
  id: string // WABA ID
  changes: Array<{
    value: MetaTemplateStatusUpdate
    field: string // "message_template_status_update"
  }>
}

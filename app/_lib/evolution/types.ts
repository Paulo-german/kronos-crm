// -----------------------------------------------------------------------------
// Evolution API Webhook Types
// -----------------------------------------------------------------------------

export interface EvolutionMessageKey {
  remoteJid: string
  /** Quando remoteJid é @lid (Linked ID), o número real vem aqui como @s.whatsapp.net */
  remoteJidAlt?: string
  fromMe: boolean
  id: string
}

export interface EvolutionMessageContent {
  conversation?: string
  extendedTextMessage?: {
    text: string
  }
  audioMessage?: {
    url: string
    mimetype: string
    seconds: number
  }
  imageMessage?: {
    url: string
    mimetype: string
    caption?: string
  }
  documentMessage?: {
    url: string
    mimetype: string
    fileName: string
    caption?: string
  }
}

export interface EvolutionMessageData {
  key: EvolutionMessageKey
  pushName?: string
  message: EvolutionMessageContent
  messageType: string
  messageTimestamp: number
}

export interface EvolutionWebhookPayload {
  event: string
  instance: string
  data: EvolutionMessageData
}

// -----------------------------------------------------------------------------
// Normalized Message (provider-agnostic, sent to Trigger.dev)
// -----------------------------------------------------------------------------

export type NormalizedMessageType = 'text' | 'audio' | 'image' | 'document'

export interface NormalizedMediaInfo {
  url: string
  mimetype: string
  fileName?: string
  seconds?: number
}

export interface NormalizedWhatsAppMessage {
  messageId: string
  remoteJid: string
  phoneNumber: string
  pushName: string | null
  fromMe: boolean
  timestamp: number
  type: NormalizedMessageType
  text: string | null
  media: NormalizedMediaInfo | null
  instanceName: string
}

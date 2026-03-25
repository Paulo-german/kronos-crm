import type { ConnectionType } from '@prisma/client'

// Contexto de provider WhatsApp necessário para a tool send_product_media
// Espelha a InboxProviderContext de app/_lib/whatsapp/provider.ts
export interface InboxProviderContext {
  connectionType: ConnectionType
  evolutionInstanceName: string | null
  metaPhoneNumberId: string | null
  metaAccessToken: string | null
  zapiInstanceId: string | null
  zapiToken: string | null
  zapiClientToken: string | null
}

export interface ToolContext {
  organizationId: string
  agentId: string
  agentName: string
  conversationId: string
  contactId: string
  dealId: string | null
  pipelineIds: string[]
  // Necessários para send_product_media
  remoteJid: string | null
  inboxProvider: InboxProviderContext | null
}

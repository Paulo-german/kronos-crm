import type { ConnectionType, InboxChannel } from '@prisma/client'

// Contexto de provider WhatsApp necessário para a tool send_product_media
// Espelha a InboxProviderContext de app/_lib/whatsapp/provider.ts
export interface InboxProviderContext {
  connectionType: ConnectionType
  channel: InboxChannel
  evolutionInstanceName: string | null
  evolutionApiUrl: string | null
  evolutionApiKey: string | null
  metaPhoneNumberId: string | null
  metaAccessToken: string | null
  metaIgUserId: string | null
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
  // Callback chamado quando hand_off_to_human executa com mode='transfer' com sucesso.
  // Permite detectar o hand-off mesmo quando result.steps fica vazio (ex: NoOutputGeneratedError fallback).
  onHandOffTransfer?: () => void
}

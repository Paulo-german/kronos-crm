import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import type { ConnectionType } from '@prisma/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Subconjunto das credenciais do inbox necessárias para resolução de provider.
 * Espelha InboxProviderContext de app/_lib/whatsapp/provider.ts.
 */
export interface InboxCredentials {
  connectionType: ConnectionType
  evolutionInstanceName: string | null
  evolutionApiUrl: string | null
  evolutionApiKey: string | null
  metaPhoneNumberId: string | null
  metaAccessToken: string | null
  zapiInstanceId: string | null
  zapiToken: string | null
  zapiClientToken: string | null
}

export interface SendWhatsappMessageCtx {
  conversationId: string
  messageId: string
  credentials: InboxCredentials
  remoteJid: string
  text: string
}

export interface SendWhatsappMessageResult {
  sentIds: string[]
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Envia mensagem de texto via WhatsApp com routing por provider.
 *
 * Usa resolveWhatsAppProvider (provider unificado) em vez de replicar o
 * if/else por provider — garante paridade com o restante do codebase e
 * facilita adicionar novos providers futuros em um único lugar.
 *
 * Retorna os sentIds (ids da mensagem no provider) para uso pelo dedup.
 * Propaga erro (throw) — falha no envio deve escalar para o orchestrator
 * decidir retry/refund.
 */
export async function sendWhatsappMessage(
  ctx: SendWhatsappMessageCtx,
): Promise<SendWhatsappMessageResult> {
  const { credentials, remoteJid, text } = ctx

  const provider = resolveWhatsAppProvider(credentials)
  const sentIds = await provider.sendText(remoteJid, text)

  return { sentIds }
}

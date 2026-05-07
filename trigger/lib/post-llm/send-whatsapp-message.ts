import crypto from 'crypto'
import { logger } from '@trigger.dev/sdk/v3'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { IG_MAX_TEXT_LENGTH } from '@/_lib/instagram/constants'
import type { ConnectionType, InboxChannel } from '@prisma/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Subconjunto das credenciais do inbox necessárias para resolução de provider.
 * Espelha InboxProviderContext de app/_lib/whatsapp/provider.ts.
 */
export interface InboxCredentials {
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

export interface SendWhatsappMessageCtx {
  conversationId: string
  messageId: string
  credentials: InboxCredentials
  remoteJid: string
  text: string
  fetcher?: typeof fetch
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
  const { credentials, remoteJid, text, fetcher } = ctx

  // SIMULATOR: nunca enviar para provider real — credenciais são fictícias.
  // Retorna ID sintético para preservar dedup/logging do caller. Sem este guard,
  // o pipeline V2 dispara erro real ao tentar resolver Evolution/Meta com
  // instanceName fake, e o Trigger.dev re-executa a task até maxAttempts.
  if (credentials.connectionType === 'SIMULATOR') {
    return { sentIds: [`sim_resp_${crypto.randomUUID()}`] }
  }

  // Instagram não suporta chunking — a mensagem já chega inteira ao provider.
  // Porém a Graph API rejeita textos acima de 1000 chars com erro 400;
  // truncamos aqui para garantir entrega ao invés de silenciar a resposta.
  const textToSend =
    credentials.channel === 'INSTAGRAM_DM' && text.length > IG_MAX_TEXT_LENGTH
      ? (() => {
          logger.warn('Instagram message truncated to IG_MAX_TEXT_LENGTH', {
            originalLength: text.length,
            truncatedLength: IG_MAX_TEXT_LENGTH,
            conversationId: ctx.conversationId,
          })
          return text.slice(0, IG_MAX_TEXT_LENGTH)
        })()
      : text

  const provider = resolveWhatsAppProvider(credentials, fetcher)
  const sentIds = await provider.sendText(remoteJid, textToSend)

  return { sentIds }
}

import { logger } from '@trigger.dev/sdk/v3'
import { redis } from '@/_lib/redis'
import {
  sendWhatsappMessage,
  type InboxCredentials,
} from './post-llm/send-whatsapp-message'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SendOutboundMessageCtx {
  conversationId: string
  organizationId: string
  credentials: InboxCredentials
  remoteJid: string
  text: string
  dedupTtlSeconds?: number // default 300
  fetcher?: typeof fetch
}

interface SendOutboundMessageResult {
  sentIds: string[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_DEDUP_TTL_SECONDS = 300

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Envia mensagem de saída via WhatsApp e pré-registra as dedup keys no Redis.
 *
 * O pré-registro evita que o webhook fromMe trate a mensagem do agente como
 * mensagem recebida — sem ele, o banco receberia duplicata e o auto-pause
 * da IA seria acionado indevidamente.
 *
 * Simulator não tem webhook externo: IDs sintéticos são descartados (sem Redis).
 */
export async function sendOutboundMessage(
  ctx: SendOutboundMessageCtx,
): Promise<SendOutboundMessageResult> {
  const {
    conversationId,
    credentials,
    remoteJid,
    text,
    dedupTtlSeconds = DEFAULT_DEDUP_TTL_SECONDS,
    fetcher,
  } = ctx

  const messageId = conversationId

  const result = await sendWhatsappMessage({
    conversationId,
    messageId,
    credentials,
    remoteJid,
    text,
    fetcher,
  })

  const { sentIds } = result

  // Simulator já tratado dentro de sendWhatsappMessage (retorna ID sintético).
  // IDs sintéticos não precisam de registro no Redis — não há webhook para dedup.
  if (credentials.connectionType !== 'SIMULATOR') {
    await Promise.all(
      sentIds.map((sentId) =>
        redis.set(`dedup:${sentId}`, '1', 'EX', dedupTtlSeconds).catch((redisError) => {
          // Falha no Redis não bloqueia o envio, mas sem a dedup key o webhook pode
          // tratar esta mensagem do agente como input do usuário e criar duplicata
          logger.error('sendOutboundMessage: failed to register dedup key in Redis', {
            sentId,
            conversationId,
            error: redisError instanceof Error ? redisError.message : String(redisError),
          })
        }),
      ),
    )
  }

  return { sentIds }
}

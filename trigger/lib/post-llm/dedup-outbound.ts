import { logger } from '@trigger.dev/sdk/v3'
import { redis } from '@/_lib/redis'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TTL_SECONDS = 300

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DedupOutboundCtx {
  sentId: string
  ttlSeconds?: number
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Registra a key dedup:${sentId} no Redis com TTL configurável.
 *
 * O webhook de inbound consulta esta key para descartar echoes do próprio
 * bot (fromMe=true que voltariam como mensagem nova) — evita duplicata no
 * banco e auto-pause indevido da IA.
 *
 * Erro é logado mas NÃO propaga: Redis indisponível resulta em pior caso
 * de um echo duplicado, que é aceitável vs. bloquear o fluxo principal
 * após a mensagem já ter sido enviada ao cliente.
 */
export async function dedupOutbound(ctx: DedupOutboundCtx): Promise<void> {
  const { sentId, ttlSeconds = DEFAULT_TTL_SECONDS } = ctx

  try {
    await redis.set(`dedup:${sentId}`, '1', 'EX', ttlSeconds)
  } catch (error) {
    logger.warn('Falha ao registrar dedup key no Redis (non-fatal)', {
      sentId,
      ttlSeconds,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

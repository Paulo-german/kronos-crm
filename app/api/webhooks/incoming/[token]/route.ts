import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { db } from '@/_lib/prisma'
import { getWebhookSourceByToken } from '@/_data-access/webhook-source/get-webhook-source-by-token'
import { processInboundWebhook } from '@/_lib/webhooks/process-inbound-webhook'
import { checkRateLimit, maybeGcBuckets } from '@/_lib/webhooks/rate-limiter'
import { persistWebhookLog } from '@/_lib/webhooks/persist-webhook-log'

const MAX_PAYLOAD_BYTES = 512 * 1024
const DEDUP_WINDOW_HOURS = 24
const RAW_BODY_TRUNCATE_BYTES = 1024
const MS_PER_HOUR = 60 * 60 * 1000

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { token } = await params

  // 1. Rate limit antes de qualquer hit no banco — protege contra flood com token válido
  const rateLimit = checkRateLimit(token)
  maybeGcBuckets()
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.resetAt),
        },
      },
    )
  }

  try {
    // 2. Resolver source — sem cache pra que isActive/regen tenham efeito imediato
    const source = await getWebhookSourceByToken(token)
    if (!source || !source.isActive) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    // 3. Defesa antecipada via Content-Length antes de drenar o body
    const contentLength = Number(request.headers.get('content-length') ?? '0')
    if (contentLength > MAX_PAYLOAD_BYTES) {
      await persistWebhookLog({
        webhookSourceId: source.id,
        organizationId: source.organizationId,
        payload: { _truncated: true, contentLength },
        resolvedData: {},
        status: 'ERROR',
        errorMessage: `Payload too large (${contentLength} bytes)`,
      })
      return NextResponse.json({ error: 'payload_too_large' }, { status: 413 })
    }

    // 4. Leitura do body — fallback silencioso se o stream falhar (cliente já desconectou)
    let rawBody: string
    try {
      rawBody = await request.text()
    } catch {
      return NextResponse.json({ success: true })
    }
    if (rawBody.length > MAX_PAYLOAD_BYTES) {
      await persistWebhookLog({
        webhookSourceId: source.id,
        organizationId: source.organizationId,
        payload: { _truncated: true, length: rawBody.length },
        resolvedData: {},
        status: 'ERROR',
        errorMessage: 'Payload too large (post-read)',
      })
      return NextResponse.json({ error: 'payload_too_large' }, { status: 413 })
    }

    // 5. HMAC — import dinâmico mantém o módulo fora do bundle quando sem secret
    if (source.secretKey) {
      const { verifyHmacSignature } = await import('@/_lib/webhooks/verify-hmac-signature')
      const signatureValid = verifyHmacSignature({
        platform: source.platform,
        rawBody,
        secretKey: source.secretKey,
        headers: request.headers,
      })
      if (!signatureValid) {
        await persistWebhookLog({
          webhookSourceId: source.id,
          organizationId: source.organizationId,
          payload: { _rejected: true, reason: 'invalid_signature' },
          resolvedData: {},
          status: 'ERROR',
          errorMessage: 'Invalid HMAC signature',
        })
        return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
      }
    }

    // 6. Parse JSON — JSON inválido é registrado como ERROR mas retorna 200 pra evitar retry loop
    let payload: unknown = null
    try {
      payload = JSON.parse(rawBody)
    } catch {
      const log = await persistWebhookLog({
        webhookSourceId: source.id,
        organizationId: source.organizationId,
        payload: { _raw: rawBody.slice(0, RAW_BODY_TRUNCATE_BYTES) },
        resolvedData: {},
        status: 'ERROR',
        errorMessage: 'Invalid JSON payload',
      })
      return NextResponse.json({ success: true, logId: log.id })
    }

    // 7. Idempotência: se o emissor envia X-Webhook-Event-Id, retornamos o log original
    const rawEventId = request.headers.get('x-webhook-event-id')
    const externalEventId = rawEventId ? rawEventId.slice(0, 255) : null
    if (externalEventId) {
      const since = new Date(Date.now() - DEDUP_WINDOW_HOURS * MS_PER_HOUR)
      const duplicate = await db.webhookLog.findFirst({
        where: {
          webhookSourceId: source.id,
          externalEventId,
          receivedAt: { gte: since },
        },
        select: { id: true },
      })
      if (duplicate) {
        return NextResponse.json({ success: true, logId: duplicate.id, deduplicated: true })
      }
    }

    // 8. Pipeline de processamento — retorna 200 imediatamente, processa em background
    waitUntil(
      processInboundWebhook({
        source: {
          id: source.id,
          organizationId: source.organizationId,
          squadId: source.squadId,
          platform: source.platform,
          eventType: source.eventType,
          fieldMapping: source.fieldMapping as Record<string, string>,
          isActive: source.isActive,
          secretKey: source.secretKey,
        },
        payload,
        externalEventId,
        isReplay: false,
      }),
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    // Erro inesperado (banco indisponível, etc.) — 500 é correto aqui: sinaliza ao emissor
    // que deve retentar. O dedup window (24h) protege contra duplicatas no retry.
    console.error('[webhook/incoming] Unhandled error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { getWebhookSourceByToken } from '@/_data-access/webhook-source/get-webhook-source-by-token'
import { checkRateLimit, maybeGcBuckets } from '@/_lib/webhooks/rate-limiter'

const MAX_PAYLOAD_BYTES = 512 * 1024

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { token } = await params

  const rateLimit = checkRateLimit(`test:${token}`)
  maybeGcBuckets()
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429 })
  }

  try {
    const source = await getWebhookSourceByToken(token)
    if (!source || !source.isActive) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const contentLength = Number(request.headers.get('content-length') ?? '0')
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'payload_too_large' }, { status: 413 })
    }

    let rawBody: string
    try {
      rawBody = await request.text()
    } catch {
      return NextResponse.json({ error: 'read_error' }, { status: 400 })
    }

    if (rawBody.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'payload_too_large' }, { status: 413 })
    }

    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }

    await db.webhookSource.update({
      where: { id: source.id },
      data: { lastTestPayload: payload as Prisma.InputJsonValue, lastTestAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[webhook/test] Unhandled error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

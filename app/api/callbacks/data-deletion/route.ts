import { randomUUID } from 'crypto'
import { db } from '@/_lib/prisma'
import { verifyMetaSignedRequest } from '@/_lib/meta/verify-signed-request'
import type { Prisma } from '@prisma/client'

// A URL base da app — NEXT_PUBLIC_APP_URL é definida em .env.example (item 4)
// Fallback para VERCEL_URL quando a variável canônica não está disponível (ex: preview deploys)
function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// -----------------------------------------------------------------------------
// POST — Callback de data deletion obrigatório pela Meta
// Chamado quando um usuário revoga as permissões do app no Facebook/Instagram.
// Endpoint público — autenticação via HMAC SHA256 (signed_request).
// -----------------------------------------------------------------------------
export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') ?? ''

  // Extrair signed_request: Meta pode enviar form-urlencoded ou JSON
  let signedRequest: string | null = null

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text()
    const params = new URLSearchParams(text)
    signedRequest = params.get('signed_request')
  } else {
    // Assumir JSON se não for form-encoded
    try {
      const body = await req.json() as Record<string, unknown>
      const value = body.signed_request
      signedRequest = typeof value === 'string' ? value : null
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  if (!signedRequest) {
    return new Response(JSON.stringify({ error: 'Missing signed_request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verificar HMAC SHA256 — rejeitar se inválido
  const payload = verifyMetaSignedRequest(signedRequest)
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { user_id: metaUserId } = payload
  const confirmationCode = `del_${randomUUID()}`

  // Persistir registro de auditoria — best-effort (Meta só exige que retornemos o código)
  try {
    await db.metaDataDeletionRequest.create({
      data: {
        metaUserId,
        confirmationCode,
        status: 'RECEIVED',
        payload: payload as Prisma.InputJsonValue,
      },
    })
  } catch (error) {
    console.error('[data-deletion] Failed to persist deletion request:', { metaUserId, error })
    // Mesmo com falha de persistência, retornamos confirmação — Meta não deve retentar por erro de banco
  }

  const statusUrl = `${getAppUrl()}/data-deletion-status?code=${confirmationCode}`

  return new Response(
    JSON.stringify({ url: statusUrl, confirmation_code: confirmationCode }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

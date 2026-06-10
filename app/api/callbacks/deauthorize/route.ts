import { verifyMetaSignedRequest } from '@/_lib/meta/verify-signed-request'

// -----------------------------------------------------------------------------
// POST — Callback de desautorização obrigatório pela Meta
// Chamado quando um usuário remove o app nas configurações do Facebook/Instagram.
// Diferente do data-deletion: apenas notifica que o usuário desautorizou.
// Endpoint público — autenticação via HMAC SHA256 (signed_request).
// -----------------------------------------------------------------------------
export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') ?? ''

  let signedRequest: string | null = null

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text()
    const params = new URLSearchParams(text)
    signedRequest = params.get('signed_request')
  } else {
    try {
      const body = (await req.json()) as Record<string, unknown>
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

  const payload = verifyMetaSignedRequest(signedRequest)
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Desautorização não exige ação imediata — o token do usuário simplesmente deixa de funcionar.
  // Logar para auditoria e retornar 200 conforme esperado pela Meta.
  // eslint-disable-next-line no-console
  console.log('[deauthorize] User deauthorized app:', {
    metaUserId: payload.user_id,
  })

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

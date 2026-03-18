/**
 * Troca o authorization code do Embedded Signup por um access token permanente.
 * SEGURANCA: Meta APP_SECRET nunca sai do servidor — troca feita server-side.
 */
export async function exchangeMetaCodeForToken(code: string): Promise<string> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const apiVersion = process.env.META_API_VERSION ?? 'v25.0'

  if (!appId || !appSecret) {
    throw new Error('NEXT_PUBLIC_META_APP_ID and META_APP_SECRET must be configured')
  }

  const url = new URL(`https://graph.facebook.com/${apiVersion}/oauth/access_token`)
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('code', code)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Meta token exchange failed (${response.status}): ${errorBody}`)
  }

  const data = (await response.json().catch(() => null)) as { access_token?: string; error?: unknown } | null

  if (!data?.access_token) {
    const errorDetails = JSON.stringify(data?.error ?? 'no access_token in response')
    throw new Error(`Meta token exchange: invalid response — ${errorDetails}`)
  }

  return data.access_token
}

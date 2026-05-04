const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/instagram/callback`

interface ShortLivedTokenResponse {
  access_token: string
  user_id: number
}

interface LongLivedTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

/**
 * Troca o authorization code por um short-lived token do Instagram.
 * Endpoint próprio do instagram.com — não usa a Graph API versionada.
 */
export async function exchangeInstagramCodeForToken(
  code: string,
): Promise<{ accessToken: string; igUserId: string }> {
  const body = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_META_INSTAGRAM_APP_ID ?? '',
    client_secret: process.env.META_INSTAGRAM_APP_SECRET ?? '',
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
    code,
  })

  console.log('[exchange-token] short-lived token request:', {
    url: 'https://api.instagram.com/oauth/access_token',
    client_id: process.env.NEXT_PUBLIC_META_INSTAGRAM_APP_ID,
    redirect_uri: REDIRECT_URI,
    has_secret: !!process.env.META_INSTAGRAM_APP_SECRET,
    code_length: code.length,
  })

  const response = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const errorBody = await response.text().catch(() => 'unknown')
  console.log('[exchange-token] short-lived token response:', {
    status: response.status,
    body: errorBody,
  })

  if (!response.ok) {
    throw new Error(
      `Instagram token exchange failed (${response.status}): ${errorBody}`,
    )
  }

  let data: ShortLivedTokenResponse | null = null
  try { data = JSON.parse(errorBody) as ShortLivedTokenResponse } catch { data = null }

  if (!data?.access_token || !data?.user_id) {
    throw new Error(
      'Instagram token exchange: resposta inválida — access_token ou user_id ausente',
    )
  }

  return {
    accessToken: data.access_token,
    igUserId: String(data.user_id),
  }
}

/**
 * Troca o short-lived token (1h) por um long-lived token (60 dias).
 * Usa graph.instagram.com sem versão — endpoint de troca não é versionado.
 */
export async function getLongLivedInstagramToken(shortLivedToken: string): Promise<string> {
  const url = new URL('https://graph.instagram.com/access_token')
  url.searchParams.set('grant_type', 'ig_exchange_token')
  url.searchParams.set('client_secret', process.env.META_INSTAGRAM_APP_SECRET ?? '')
  url.searchParams.set('access_token', shortLivedToken)

  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Instagram long-lived token exchange failed (${response.status}): ${errorBody}`,
    )
  }

  const data = (await response.json().catch(() => null)) as LongLivedTokenResponse | null

  if (!data?.access_token) {
    throw new Error(
      'Instagram long-lived token exchange: resposta inválida — access_token ausente',
    )
  }

  return data.access_token
}

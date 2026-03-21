const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

const SCOPES = ['https://www.googleapis.com/auth/calendar.events']

interface GoogleTokenResponse {
  accessToken: string
  refreshToken: string | null
  expiresIn: number
  scope: string
}

interface GoogleUserInfo {
  email: string
  name: string
}

function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth credentials are not configured')
  }

  return { clientId, clientSecret, redirectUri }
}

/**
 * Gera a URL de autorização do Google OAuth com o state CSRF-safe.
 */
export function generateGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleCredentials()

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Troca o código de autorização por tokens de acesso e refresh.
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getGoogleCredentials()

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for tokens: ${error}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in,
    scope: data.scope,
  }
}

/**
 * Renova o access token usando o refresh token.
 * Nota: Google só retorna refresh_token na primeira concessão — não em refreshes.
 */
export async function refreshGoogleTokens(refreshToken: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleCredentials()

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh tokens: ${error}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: null,
    expiresIn: data.expires_in,
    scope: data.scope,
  }
}

/**
 * Revoga um token Google (access ou refresh).
 */
export async function revokeGoogleToken(token: string): Promise<void> {
  const response = await fetch(`${GOOGLE_REVOKE_URL}?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to revoke token: ${error}`)
  }
}

/**
 * Busca informações do usuário Google (email e nome).
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get user info: ${error}`)
  }

  const data = await response.json()

  return {
    email: data.email,
    name: data.name ?? data.email,
  }
}

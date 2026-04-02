import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { revalidateTag, revalidatePath } from 'next/cache'
import { createClient } from '@/_lib/supabase/server'
import { db } from '@/_lib/prisma'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { exchangeCodeForTokens, getGoogleUserInfo } from '@/_lib/integrations/google/google-oauth'
import { encryptToken } from '@/_lib/integrations/encryption'

const STATE_MAX_AGE_MS = 5 * 60 * 1000 // 5 minutos

interface OAuthState {
  userId: string
  orgId: string
  orgSlug: string
  timestamp: number
}

function decodeState(stateParam: string): OAuthState | null {
  try {
    const decoded = Buffer.from(stateParam, 'base64url').toString('utf8')
    return JSON.parse(decoded) as OAuthState
  } catch {
    return null
  }
}

/**
 * Resolve o orgSlug a partir do state ou fallback para o cookie.
 * Usado nos redirects de erro onde o state pode não estar disponível.
 */
async function resolveOrgSlug(state: OAuthState | null): Promise<string> {
  if (state?.orgSlug) return state.orgSlug

  const cookieStore = await cookies()
  const slugFromCookie = cookieStore.get(ORG_SLUG_COOKIE)?.value
  return slugFromCookie ?? ''
}

function buildSettingsUrl(orgSlug: string, params: string): string {
  if (!orgSlug) return `/settings?${params}`
  return `/org/${orgSlug}/settings/integrations?${params}`
}

/**
 * GET /api/integrations/google/callback
 *
 * Callback do OAuth do Google. Troca o code por tokens, encripta e salva no banco.
 * Redireciona para a página de integrações após conclusão.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const error = searchParams.get('error')

  // Tentar decodificar state mesmo em caso de erro (para obter orgSlug)
  const state = stateParam ? decodeState(stateParam) : null

  // Usuário negou a permissão no Google
  if (error) {
    const orgSlug = await resolveOrgSlug(state)
    redirect(buildSettingsUrl(orgSlug, 'error=access_denied'))
  }

  if (!code || !stateParam) {
    const orgSlug = await resolveOrgSlug(state)
    redirect(buildSettingsUrl(orgSlug, 'error=invalid_request'))
  }

  if (!state) {
    const orgSlug = await resolveOrgSlug(null)
    redirect(buildSettingsUrl(orgSlug, 'error=invalid_state'))
  }

  // Verificar janela de tempo (5 minutos)
  if (Date.now() - state.timestamp > STATE_MAX_AGE_MS) {
    redirect(`/org/${state.orgSlug}/settings/integrations?error=state_expired`)
  }

  // Validar que o usuário logado é o mesmo do state (anti-CSRF)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== state.userId) {
    redirect(`/org/${state.orgSlug}/settings/integrations?error=user_mismatch`)
  }

  // Trocar code por tokens
  let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>
  try {
    tokens = await exchangeCodeForTokens(code)
  } catch {
    redirect(`/org/${state.orgSlug}/settings/integrations?error=token_exchange_failed`)
  }

  if (!tokens.refreshToken) {
    redirect(`/org/${state.orgSlug}/settings/integrations?error=no_refresh_token`)
  }

  // Buscar email do usuário Google
  let googleUserInfo: { email: string; name: string }
  try {
    googleUserInfo = await getGoogleUserInfo(tokens.accessToken)
  } catch {
    redirect(`/org/${state.orgSlug}/settings/integrations?error=userinfo_failed`)
  }

  // Encriptar tokens antes de salvar
  const accessTokenEncrypted = encryptToken(tokens.accessToken)
  const refreshTokenEncrypted = encryptToken(tokens.refreshToken)
  const tokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000)

  // Upsert da integração — se já existe, atualiza tokens e reativa
  await db.userIntegration.upsert({
    where: {
      userId_organizationId_provider: {
        userId: state.userId,
        organizationId: state.orgId,
        provider: 'GOOGLE_CALENDAR',
      },
    },
    update: {
      status: 'ACTIVE',
      accessTokenEncrypted,
      refreshTokenEncrypted,
      tokenExpiresAt,
      scope: tokens.scope,
      providerAccountId: googleUserInfo.email,
      syncError: null,
    },
    create: {
      userId: state.userId,
      organizationId: state.orgId,
      provider: 'GOOGLE_CALENDAR',
      status: 'ACTIVE',
      accessTokenEncrypted,
      refreshTokenEncrypted,
      tokenExpiresAt,
      scope: tokens.scope,
      providerAccountId: googleUserInfo.email,
    },
  })

  // Invalidar cache de integrações da org + full page cache
  revalidateTag(`integrations:${state.orgId}`)
  revalidatePath(`/org/${state.orgSlug}/settings/integrations`)

  redirect(`/org/${state.orgSlug}/settings/integrations?connected=google`)
}

import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/_lib/supabase/server'
import { db } from '@/_lib/prisma'
import { exchangeInstagramCodeForToken, getLongLivedInstagramToken, InstagramApiError } from '@/_lib/instagram/exchange-token'
import { subscribeInstagramApp } from '@/_lib/instagram/subscribe-instagram-app'
import { getInstagramUsername } from '@/_lib/instagram/get-instagram-account'

const STATE_MAX_AGE_MS = 5 * 60 * 1000 // 5 minutos

interface OAuthState {
  userId: string
  orgId: string
  orgSlug: string
  inboxId: string
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

function buildInboxUrl(orgSlug: string, inboxId: string, params: string): string {
  if (!orgSlug || !inboxId) return `/settings?${params}`
  return `/org/${orgSlug}/settings/inboxes/${inboxId}?${params}`
}

/**
 * GET /api/integrations/instagram/callback
 *
 * Callback do OAuth do Instagram. Troca o code por tokens, persiste no Inbox
 * e redireciona para a página de configuração do inbox após conclusão.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const error = searchParams.get('error')

  // Tentar decodificar state mesmo em caso de erro (para obter orgSlug e inboxId)
  const state = stateParam ? decodeState(stateParam) : null

  // Usuário negou a permissão no Instagram
  if (error) {
    redirect(buildInboxUrl(state?.orgSlug ?? '', state?.inboxId ?? '', 'instagram_error=access_denied'))
  }

  if (!code || !stateParam) {
    redirect(buildInboxUrl(state?.orgSlug ?? '', state?.inboxId ?? '', 'instagram_error=invalid_request'))
  }

  if (!state) {
    redirect(`/settings?instagram_error=invalid_state`)
  }

  // Verificar janela de tempo (5 minutos)
  if (Date.now() - state.timestamp > STATE_MAX_AGE_MS) {
    redirect(buildInboxUrl(state.orgSlug, state.inboxId, 'instagram_error=state_expired'))
  }

  // Validar que o usuário logado é o mesmo do state (anti-CSRF)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== state.userId) {
    redirect(buildInboxUrl(state.orgSlug, state.inboxId, 'instagram_error=user_mismatch'))
  }

  // Trocar code por short-lived token + igUserId
  let shortToken: string
  let igUserId: string
  try {
    const result = await exchangeInstagramCodeForToken(code)
    shortToken = result.accessToken
    igUserId = result.igUserId
  } catch (err) {
    console.error('[instagram/callback] exchangeInstagramCodeForToken failed:', err)
    const detail = err instanceof InstagramApiError ? err.apiMessage : undefined
    const params = detail
      ? `instagram_error=short_token_failed&instagram_error_detail=${encodeURIComponent(detail)}`
      : 'instagram_error=short_token_failed'
    redirect(buildInboxUrl(state.orgSlug, state.inboxId, params))
  }

  // Trocar por long-lived token (60 dias)
  let longToken: string
  try {
    longToken = await getLongLivedInstagramToken(shortToken)
  } catch (err) {
    console.error('[instagram/callback] getLongLivedInstagramToken failed:', err)
    const detail = err instanceof InstagramApiError ? err.apiMessage : undefined
    const params = detail
      ? `instagram_error=long_token_failed&instagram_error_detail=${encodeURIComponent(detail)}`
      : 'instagram_error=long_token_failed'
    redirect(buildInboxUrl(state.orgSlug, state.inboxId, params))
  }

  // Verificar conflito: igUserId já conectado em outro inbox da plataforma
  const conflict = await db.inbox.findFirst({
    where: { metaIgUserId: igUserId, id: { not: state.inboxId } },
    select: { id: true },
  })

  if (conflict) {
    redirect(buildInboxUrl(state.orgSlug, state.inboxId, 'instagram_error=already_connected'))
  }

  // Subscribe não-bloqueante — falha não impede a conexão
  subscribeInstagramApp(igUserId, longToken).catch((err: unknown) => {
    console.error('[instagram/callback] subscribeInstagramApp failed:', err)
  })

  // Buscar username não-bloqueante — fallback para string vazia
  let igUsername = ''
  try {
    igUsername = await getInstagramUsername(igUserId, longToken)
  } catch (err) {
    console.error('[instagram/callback] getInstagramUsername failed:', err)
  }

  // Buscar inbox para obter agentId (necessário para invalidar cache do agente)
  const inbox = await db.inbox.findFirst({
    where: { id: state.inboxId, organizationId: state.orgId },
    select: { id: true, agentId: true },
  })

  if (!inbox) {
    redirect(buildInboxUrl(state.orgSlug, state.inboxId, 'instagram_error=inbox_not_found'))
  }

  // Atualizar inbox com credenciais do Instagram Login
  // metaIgPageId permanece null — Instagram Login não fornece Page ID
  await db.inbox.update({
    where: { id: state.inboxId },
    data: {
      connectionType: 'META_CLOUD',
      metaIgUserId: igUserId,
      metaIgUsername: igUsername || null,
      metaAccessToken: longToken,
    },
  })

  // Invalidar cache do inbox e do agente vinculado (se houver)
  revalidateTag(`inbox:${state.inboxId}`)
  revalidateTag(`inboxes:${state.orgId}`)
  if (inbox.agentId) {
    revalidateTag(`agent:${inbox.agentId}`)
    revalidateTag(`agents:${state.orgId}`)
  }

  redirect(buildInboxUrl(state.orgSlug, state.inboxId, 'instagram=connected'))
}

import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { db } from '@/_lib/prisma'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'

/**
 * GET /api/integrations/instagram/auth-url?inboxId=<uuid>
 *
 * Gera a URL de autorização do Instagram OAuth com state anti-CSRF.
 * O state é um JSON base64 com { userId, orgId, orgSlug, inboxId, timestamp }.
 * O callback valida que o timestamp tem menos de 5 minutos.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const inboxId = searchParams.get('inboxId')

  if (!inboxId) {
    return NextResponse.json({ error: 'inboxId is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cookieStore = await cookies()
  const orgSlug = cookieStore.get(ORG_SLUG_COOKIE)?.value

  if (!orgSlug) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 400 },
    )
  }

  // Validar que o usuário é membro ativo da organização
  const member = await db.member.findFirst({
    where: {
      userId: user.id,
      status: 'ACCEPTED',
      organization: { slug: orgSlug },
    },
    select: {
      organizationId: true,
    },
  })

  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { organizationId: orgId } = member

  // Validar que o inbox pertence à org e é do canal correto
  const inbox = await db.inbox.findFirst({
    where: { id: inboxId, organizationId: orgId, channel: 'INSTAGRAM_DM' },
    select: { id: true },
  })

  if (!inbox) {
    return NextResponse.json({ error: 'Inbox not found' }, { status: 404 })
  }

  // Gerar state como JSON base64 com timestamp para validação no callback (janela de 5 min)
  const statePayload = {
    userId: user.id,
    orgId,
    orgSlug,
    inboxId,
    timestamp: Date.now(),
  }
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url')

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/instagram/callback`

  const authUrl = new URL('https://www.instagram.com/oauth/authorize')
  authUrl.searchParams.set(
    'client_id',
    process.env.NEXT_PUBLIC_META_INSTAGRAM_APP_ID ?? '',
  )
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set(
    'scope',
    'instagram_business_basic,instagram_business_manage_messages',
  )
  authUrl.searchParams.set('force_reauth', 'true')
  authUrl.searchParams.set('state', state)

  const finalUrl = authUrl.toString()
  // eslint-disable-next-line no-console
  console.log('[auth-url] generated:', finalUrl)

  return NextResponse.json(
    { url: finalUrl },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}

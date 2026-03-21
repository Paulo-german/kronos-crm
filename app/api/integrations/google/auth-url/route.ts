import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { db } from '@/_lib/prisma'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { generateGoogleAuthUrl } from '@/_lib/integrations/google/google-oauth'

/**
 * GET /api/integrations/google/auth-url
 *
 * Gera a URL de autorização do Google OAuth com state anti-CSRF.
 * O state é um JSON base64 com { userId, orgId, orgSlug, timestamp }.
 * O callback valida que o timestamp tem menos de 5 minutos.
 */
export async function GET() {
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
    return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
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

  // Gerar state como JSON base64 com timestamp para validação no callback (janela de 5 min)
  const statePayload = {
    userId: user.id,
    orgId,
    orgSlug,
    timestamp: Date.now(),
  }
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url')

  const url = generateGoogleAuthUrl(state)

  return NextResponse.json({ url })
}

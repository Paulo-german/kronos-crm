import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { getInboxMetaCredentials } from '@/_data-access/inbox/get-inbox-meta-credentials'
import { fetchMetaTemplates } from '@/_lib/meta/template-api'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'

/**
 * GET /api/inbox/templates?inboxId={uuid}
 *
 * Retorna templates APPROVED de um inbox META_CLOUD.
 * Busca direto da Meta API — controle de staleness fica no client.
 */
export async function GET(request: NextRequest) {
  const tag = '[api/inbox/templates]'

  try {
    // 1. Auth
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn(tag, 'EXIT: no authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Org context
    const cookieStore = await cookies()
    const orgSlug = cookieStore.get(ORG_SLUG_COOKIE)?.value

    if (!orgSlug) {
      console.warn(tag, 'EXIT: ORG_SLUG_COOKIE missing')
      return NextResponse.json({ error: 'No org context' }, { status: 400 })
    }

    // 3. Membership
    const membership = await validateMembership(user.id, orgSlug)
    if (!membership.isValid || !membership.orgId) {
      console.warn(tag, 'EXIT: membership invalid', { userId: user.id, orgSlug })
      return NextResponse.json({ error: 'No access' }, { status: 403 })
    }

    // 4. Params
    const { searchParams } = new URL(request.url)
    const inboxId = searchParams.get('inboxId')

    if (!inboxId) {
      console.warn(tag, 'EXIT: inboxId missing from query params')
      return NextResponse.json({ error: 'inboxId é obrigatório' }, { status: 400 })
    }

    console.log(tag, 'STEP 1 OK', { userId: user.id, orgSlug, orgId: membership.orgId, inboxId })

    // 5. Credentials
    const credentials = await getInboxMetaCredentials(inboxId, membership.orgId)

    if (!credentials) {
      console.warn(tag, 'EXIT: no Meta credentials found', { inboxId, orgId: membership.orgId })
      return NextResponse.json({ templates: [] })
    }

    console.log(tag, 'STEP 2 OK: credentials found', {
      inboxId,
      wabaId: credentials.wabaId,
      phoneNumberId: credentials.phoneNumberId,
      hasAccessToken: !!credentials.accessToken,
    })

    // 6. Fetch from Meta
    const response = await fetchMetaTemplates(credentials.wabaId, credentials.accessToken)

    console.log(tag, 'STEP 3 OK: Meta API returned', {
      totalTemplates: response.data.length,
      statuses: response.data.map((template) => `${template.name}:${template.status}`),
    })

    const approvedTemplates = response.data.filter((template) => template.status === 'APPROVED')

    console.log(tag, 'RESULT', {
      total: response.data.length,
      approved: approvedTemplates.length,
    })

    return NextResponse.json({ templates: approvedTemplates })
  } catch (error) {
    console.error(tag, 'EXCEPTION:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

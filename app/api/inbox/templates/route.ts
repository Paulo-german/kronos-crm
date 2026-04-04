import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { getApprovedTemplates } from '@/_data-access/inbox/get-approved-templates'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'

/**
 * GET /api/inbox/templates?inboxId={uuid}
 *
 * Retorna templates APPROVED de um inbox META_CLOUD.
 * Usado pelo template-message-dialog.tsx no chat (lazy load sob demanda).
 * Auth: Supabase + validateMembership (mesmo padrão das outras API routes do inbox).
 */
export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'No org context' }, { status: 400 })
    }

    const membership = await validateMembership(user.id, orgSlug)
    if (!membership.isValid || !membership.orgId) {
      return NextResponse.json({ error: 'No access' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const inboxId = searchParams.get('inboxId')

    if (!inboxId) {
      return NextResponse.json({ error: 'inboxId é obrigatório' }, { status: 400 })
    }

    const templates = await getApprovedTemplates(inboxId, membership.orgId)

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('[api/inbox/templates] Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

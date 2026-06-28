import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { getSimulatorTranscript } from '@/_data-access/conversation/get-simulator-transcript'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { db } from '@/_lib/prisma'

interface RouteContext {
  params: Promise<{ conversationId: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    // 1. Auth
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Guard: export é exclusivo de super admins (como o restante do simulador).
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { isSuperAdmin: true },
    })

    if (!dbUser?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    // 3. Conversa precisa ser da org E simulada (404 sem vazar existência).
    const { conversationId } = await context.params

    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: membership.orgId,
        inbox: { connectionType: 'SIMULATOR' },
      },
      select: { id: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { markdown, filename } = await getSimulatorTranscript(conversationId)

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[simulator-transcript-api] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

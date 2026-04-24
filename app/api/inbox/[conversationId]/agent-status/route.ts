import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { getActiveAgentExecution } from '@/_data-access/conversation/get-active-agent-execution'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { db } from '@/_lib/prisma'

interface RouteContext {
  params: Promise<{ conversationId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // 1. Auth via Supabase SSR
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

    // 2. Verificar membership na organização
    const membership = await validateMembership(user.id, orgSlug)
    if (!membership.isValid || !membership.orgId) {
      return NextResponse.json({ error: 'No access' }, { status: 403 })
    }

    const { conversationId } = await context.params

    // 3. Verificar se a conversa pertence à organização
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: membership.orgId,
      },
      select: { id: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 4. Buscar execução ativa (sem cache — dado efêmero, muda a cada segundo)
    const result = await getActiveAgentExecution({
      conversationId,
      organizationId: membership.orgId,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[agent-status-api] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

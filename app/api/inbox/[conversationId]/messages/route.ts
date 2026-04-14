import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { getConversationMessagesPaginated } from '@/_data-access/conversation/get-conversation-messages'
import { getConversationEvents } from '@/_data-access/conversation/get-conversation-events'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'

interface RouteContext {
  params: Promise<{ conversationId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // 1. Auth
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

    // 2. Validar conversa pertence à org + aplicar filtro RBAC
    const { conversationId } = await context.params

    // RBAC: MEMBER so pode acessar conversas atribuidas a ele (retorna 404 para nao vazar existencia)
    const elevated = isElevated(membership.userRole!)

    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: membership.orgId,
        ...(elevated ? {} : { assignedTo: user.id }),
      },
      select: { id: true, aiPaused: true, pausedAt: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 3. Buscar mensagens com paginação por cursor
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') ?? undefined
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 100)

    const [{ messages, hasMore }, events] = await Promise.all([
      getConversationMessagesPaginated(conversationId, limit, cursor),
      getConversationEvents(conversationId),
    ])

    return NextResponse.json({
      messages,
      events,
      hasMore,
      aiPaused: conversation.aiPaused,
      pausedAt: conversation.pausedAt,
    })
  } catch (error) {
    console.error('[inbox-messages-api] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

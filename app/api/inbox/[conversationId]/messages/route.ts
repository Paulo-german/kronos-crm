import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
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

    const cookieStore = await cookies()
    const orgSlug = cookieStore.get(ORG_SLUG_COOKIE)?.value

    if (!orgSlug) {
      return NextResponse.json({ error: 'No org context' }, { status: 400 })
    }

    const membership = await validateMembership(user.id, orgSlug)
    if (!membership.isValid || !membership.orgId) {
      return NextResponse.json({ error: 'No access' }, { status: 403 })
    }

    // 2. Validar conversa pertence à org
    const { conversationId } = await context.params

    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, organizationId: membership.orgId },
      select: { id: true, aiPaused: true, unreadCount: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 3. Reset unreadCount ao visualizar (se > 0)
    if (conversation.unreadCount > 0) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 },
      })
    }

    // 4. Buscar mensagens
    const messages = await db.message.findMany({
      where: {
        conversationId,
        role: { in: ['user', 'assistant'] },
        isArchived: false,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      messages,
      aiPaused: conversation.aiPaused,
    })
  } catch (error) {
    console.error('[inbox-messages-api] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

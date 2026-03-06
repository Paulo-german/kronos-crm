import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { getConversationsPaginated } from '@/_data-access/conversation/get-conversations'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { db } from '@/_lib/prisma'

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
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)
    const cursor = searchParams.get('cursor') ?? undefined
    const inboxId = searchParams.get('inboxId') ?? undefined
    const unreadOnly = searchParams.get('unread') === 'true'
    const search = searchParams.get('search') ?? undefined
    const contactId = searchParams.get('contactId') ?? undefined

    const result = await getConversationsPaginated(membership.orgId, limit, cursor, {
      inboxId,
      unreadOnly,
      search,
    })

    let deepLinkConversationId: string | undefined
    if (contactId) {
      const match = await db.conversation.findFirst({
        where: { organizationId: membership.orgId, contactId },
        select: { id: true, inboxId: true },
        orderBy: { updatedAt: 'desc' },
      })
      if (match) {
        deepLinkConversationId = match.id
      }
    }

    return NextResponse.json({
      ...result,
      ...(deepLinkConversationId ? { deepLinkConversationId } : {}),
    })
  } catch (error) {
    console.error('[inbox-conversations-api] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

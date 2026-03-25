import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { getConversationsPaginated, getConversationAsDto } from '@/_data-access/conversation/get-conversations'
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
    const unansweredOnly = searchParams.get('unanswered') === 'true'
    const search = searchParams.get('search') ?? undefined
    const contactId = searchParams.get('contactId') ?? undefined

    const result = await getConversationsPaginated(membership.orgId, limit, cursor, {
      inboxId,
      unreadOnly,
      unansweredOnly,
      search,
    })

    let deepLinkConversationId: string | undefined
    let deepLinkConversation = undefined
    let deepLinkContact: { id: string; name: string; phone: string | null } | undefined
    if (contactId) {
      const match = await db.conversation.findFirst({
        where: { organizationId: membership.orgId, contactId },
        select: { id: true },
        orderBy: { updatedAt: 'desc' },
      })
      if (match) {
        deepLinkConversationId = match.id
        deepLinkConversation = await getConversationAsDto(membership.orgId, match.id)
      } else {
        const contact = await db.contact.findFirst({
          where: { id: contactId, organizationId: membership.orgId },
          select: { id: true, name: true, phone: true },
        })
        if (contact) {
          deepLinkContact = { id: contact.id, name: contact.name, phone: contact.phone }
        }
      }
    }

    return NextResponse.json({
      ...result,
      ...(deepLinkConversationId ? { deepLinkConversationId } : {}),
      ...(deepLinkConversation ? { deepLinkConversation } : {}),
      ...(deepLinkContact ? { deepLinkContact } : {}),
    })
  } catch (error) {
    console.error('[inbox-conversations-api] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

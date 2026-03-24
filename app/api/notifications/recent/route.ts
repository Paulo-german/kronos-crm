import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { db } from '@/_lib/prisma'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { getRecentNotifications } from '@/_data-access/notification/get-recent-notifications'
import { getPendingInviteNotifications } from '@/_data-access/notification/get-pending-invite-notifications'

/**
 * GET /api/notifications/recent
 *
 * Retorna as 10 notificacoes mais recentes do usuario autenticado.
 * Chamado pelo NotificationBell ao abrir o popover para garantir lista atualizada.
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

  const member = await db.member.findFirst({
    where: {
      userId: user.id,
      status: 'ACCEPTED',
      organization: { slug: orgSlug },
    },
    select: { organizationId: true },
  })

  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [notifications, pendingInviteNotifications] = await Promise.all([
    getRecentNotifications(user.id, member.organizationId),
    getPendingInviteNotifications(user.id, user.email!),
  ])

  // Mergear e ordenar por data decrescente, limitando a 10
  const merged = [...notifications, ...pendingInviteNotifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)

  return NextResponse.json(merged)
}

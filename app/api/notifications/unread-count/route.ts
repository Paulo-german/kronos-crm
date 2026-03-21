import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { db } from '@/_lib/prisma'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { getUnreadNotificationCount } from '@/_data-access/notification/get-unread-notification-count'

/**
 * GET /api/notifications/unread-count
 *
 * Retorna o total de notificacoes nao lidas do usuario autenticado.
 * Utilizado pelo polling do client a cada 30s para atualizar o badge do bell icon.
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

  // Validar que o usuario e membro ativo da organizacao
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

  const count = await getUnreadNotificationCount(user.id, member.organizationId)

  return NextResponse.json({ count })
}

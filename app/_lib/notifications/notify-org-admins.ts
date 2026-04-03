import 'server-only'
import { after } from 'next/server'
import { db } from '@/_lib/prisma'
import { createNotification } from '@/_lib/notifications/create-notification'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'
import type { NotificationType } from '@prisma/client'

interface NotifyOrgAdminsInput {
  orgId: string
  type: NotificationType
  title: string
  body: string
  actionPath?: string // caminho relativo sem /org/slug (ex: /settings/billing)
  resourceType?: string
  resourceId?: string
}

/**
 * Agenda notificação a todos OWNER/ADMIN para após o response, preservando o contexto do request.
 * Usar no lugar de `void notifyOrgAdmins(...)` em Route Handlers.
 */
export function scheduleNotifyOrgAdmins(input: NotifyOrgAdminsInput) {
  after(async () => {
    await notifyOrgAdmins(input)
  })
}

/**
 * Notifica todos os OWNER/ADMIN ACCEPTED de uma org.
 * Resolve o slug automaticamente para construir actionUrl.
 * Fire-and-forget — nao bloqueia o caller.
 */
export async function notifyOrgAdmins(input: NotifyOrgAdminsInput) {
  const [admins, slug] = await Promise.all([
    db.member.findMany({
      where: {
        organizationId: input.orgId,
        role: { in: ['OWNER', 'ADMIN'] },
        status: 'ACCEPTED',
        userId: { not: null },
      },
      select: { userId: true },
    }),
    input.actionPath ? getOrgSlug(input.orgId) : Promise.resolve(null),
  ])

  const actionUrl =
    input.actionPath && slug ? `/org/${slug}${input.actionPath}` : undefined

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        orgId: input.orgId,
        userId: admin.userId!,
        type: input.type,
        title: input.title,
        body: input.body,
        actionUrl,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      }),
    ),
  )
}

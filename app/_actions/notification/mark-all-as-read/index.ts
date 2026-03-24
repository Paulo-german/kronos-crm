'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const markAllNotificationsAsRead = orgActionClient.action(async ({ ctx }) => {
  // 1. RBAC: verificar permissao base
  requirePermission(canPerformAction(ctx, 'notification', 'update'))

  // 2. Bulk update: nao lidas da org atual
  await db.notification.updateMany({
    where: {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      readAt: null,
    },
    data: { readAt: new Date() },
  })

  // 3. Marcar tambem notificacoes de orgs com convite pendente (cross-org)
  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true },
  })

  if (user?.email) {
    const pendingMembers = await db.member.findMany({
      where: { email: user.email, status: 'PENDING' },
      select: { organizationId: true },
    })

    const pendingOrgIds = pendingMembers.map((member) => member.organizationId)

    if (pendingOrgIds.length > 0) {
      await db.notification.updateMany({
        where: {
          userId: ctx.userId,
          organizationId: { in: pendingOrgIds },
          readAt: null,
        },
        data: { readAt: new Date() },
      })
    }
  }

  // 4. Invalidar cache do usuario
  revalidateTag(`notifications:${ctx.userId}`)

  return { success: true }
})

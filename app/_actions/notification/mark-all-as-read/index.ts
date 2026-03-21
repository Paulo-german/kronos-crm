'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const markAllNotificationsAsRead = orgActionClient.action(async ({ ctx }) => {
  // 1. RBAC: verificar permissao base
  requirePermission(canPerformAction(ctx, 'notification', 'update'))

  // 2. Bulk update: apenas as nao lidas do usuario na org atual
  await db.notification.updateMany({
    where: {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      readAt: null,
    },
    data: { readAt: new Date() },
  })

  // 3. Invalidar cache do usuario
  revalidateTag(`notifications:${ctx.userId}`)

  return { success: true }
})

'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { deleteNotificationSchema } from './schema'

export const deleteNotification = orgActionClient
  .schema(deleteNotificationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: verificar permissao base para deletar notificacoes
    requirePermission(canPerformAction(ctx, 'notification', 'delete'))

    // 2. Ownership check: a notificacao deve pertencer ao usuario na org atual
    const notification = await db.notification.findFirst({
      where: {
        id: data.notificationId,
        userId: ctx.userId,
        organizationId: ctx.orgId,
      },
    })

    if (!notification) {
      throw new Error('Notificação não encontrada.')
    }

    // 3. Deletar
    await db.notification.delete({
      where: { id: data.notificationId },
    })

    // 4. Invalidar cache do usuario
    revalidateTag(`notifications:${ctx.userId}`)

    return { success: true }
  })

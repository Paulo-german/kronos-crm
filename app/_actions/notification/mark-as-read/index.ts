'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { markAsReadSchema } from './schema'

export const markNotificationAsRead = orgActionClient
  .schema(markAsReadSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: verificar permissao base para atualizar notificacoes
    requirePermission(canPerformAction(ctx, 'notification', 'update'))

    // 2. Ownership check: a notificacao deve pertencer ao usuario
    //    Sem filtro de org para suportar notificacoes cross-org (convites pendentes)
    const notification = await db.notification.findFirst({
      where: {
        id: data.notificationId,
        userId: ctx.userId,
      },
    })

    if (!notification) {
      throw new Error('Notificação não encontrada.')
    }

    // 3. Idempotente: apenas marca se ainda nao foi lida
    if (!notification.readAt) {
      await db.notification.update({
        where: { id: data.notificationId },
        data: { readAt: new Date() },
      })
    }

    // 4. Invalidar cache do usuario
    revalidateTag(`notifications:${ctx.userId}`)

    return { success: true }
  })

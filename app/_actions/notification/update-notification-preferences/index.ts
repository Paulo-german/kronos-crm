'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { notificationPreferencesSchema } from './schema'

export const updateNotificationPreferences = orgActionClient
  .schema(notificationPreferencesSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Preferencias sao sempre do proprio usuario autenticado (ctx.userId)
    // Nao ha RBAC de entity pois nao e uma entity compartilhada
    await db.user.update({
      where: { id: ctx.userId },
      data: { notificationPreferences: data },
    })

    // Invalidar cache de preferencias e de usuario
    revalidateTag(`notification-preferences:${ctx.userId}`)
    revalidateTag(`user:${ctx.userId}`)

    return { success: true }
  })

'use server'

import { authActionClient } from '@/_lib/safe-action'
import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { notificationPreferencesSchema } from './schema'

// Preferência é puramente do usuário (não depende de org nem de plano), então usa
// authActionClient — assim a tela funciona em /account, fora do contexto de org.
export const updateNotificationPreferences = authActionClient
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

'use server'

import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { toggleSuperAdminSchema } from './schema'

export const toggleSuperAdmin = superAdminActionClient
  .schema(toggleSuperAdminSchema)
  .action(async ({ parsedInput: { userId }, ctx }) => {
    if (userId === ctx.userId) {
      throw new Error('Você não pode alterar seu próprio status de super admin.')
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    })

    if (!user) {
      throw new Error('Usuário não encontrado.')
    }

    await db.user.update({
      where: { id: userId },
      data: { isSuperAdmin: !user.isSuperAdmin },
    })

    return {
      success: true,
      isSuperAdmin: !user.isSuperAdmin,
    }
  })

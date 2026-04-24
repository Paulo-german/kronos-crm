'use server'

import { ownerActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { toggleSuperAdminSchema } from './schema'

const CONFIRMATION_WORD = 'CONFIRMAR'

export const toggleSuperAdmin = ownerActionClient
  .schema(toggleSuperAdminSchema)
  .action(async ({ parsedInput: { userId, adminKey, confirmation }, ctx }) => {
    if (userId === ctx.userId) {
      throw new Error('Você não pode alterar seu próprio status de super admin.')
    }

    const superAdminKey = process.env.SUPER_ADMIN_KEY
    if (!superAdminKey || adminKey !== superAdminKey) {
      throw new Error('Senha incorreta.')
    }

    if (confirmation !== CONFIRMATION_WORD) {
      throw new Error(`Digite "${CONFIRMATION_WORD}" exatamente para confirmar.`)
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

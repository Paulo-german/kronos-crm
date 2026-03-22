'use server'

import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { deleteModuleSchema } from './schema'

export const deleteModule = superAdminActionClient
  .schema(deleteModuleSchema)
  .action(async ({ parsedInput: { moduleId } }) => {
    const existingModule = await db.module.findUnique({
      where: { id: moduleId },
      select: {
        _count: {
          select: { features: true, planModules: true },
        },
      },
    })

    if (!existingModule) {
      throw new Error('Módulo não encontrado.')
    }

    if (existingModule._count.features > 0) {
      throw new Error(
        `Não é possível excluir: este módulo possui ${existingModule._count.features} feature(s) vinculada(s).`,
      )
    }

    if (existingModule._count.planModules > 0) {
      throw new Error(
        `Não é possível excluir: este módulo está vinculado a ${existingModule._count.planModules} plano(s).`,
      )
    }

    await db.module.delete({ where: { id: moduleId } })

    return { success: true }
  })

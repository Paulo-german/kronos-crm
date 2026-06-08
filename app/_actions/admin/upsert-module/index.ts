'use server'

import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { upsertModuleSchema } from './schema'
import { revalidateTag } from 'next/cache'

export const upsertModule = superAdminActionClient
  .schema(upsertModuleSchema)
  .action(async ({ parsedInput: { id, slug, name, isActive } }) => {
    if (id) {
      await db.module.update({
        where: { id },
        data: { slug, name, isActive },
      })
    } else {
      await db.module.create({
        data: { slug, name, isActive },
      })
    }

    // Módulos alimentam limites de plano — invalidar para refletir imediatamente
    revalidateTag('plan-limits')

    return { success: true }
  })

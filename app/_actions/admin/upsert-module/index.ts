'use server'

import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { upsertModuleSchema } from './schema'

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

    return { success: true }
  })

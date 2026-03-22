'use server'

import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { upsertFeatureSchema } from './schema'

export const upsertFeature = superAdminActionClient
  .schema(upsertFeatureSchema)
  .action(async ({ parsedInput: { id, key, name, type, valueType, moduleId } }) => {
    if (id) {
      await db.feature.update({
        where: { id },
        data: { key, name, type, valueType, moduleId },
      })
    } else {
      await db.feature.create({
        data: { key, name, type, valueType, moduleId },
      })
    }

    return { success: true }
  })

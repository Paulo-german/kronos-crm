'use server'

import { revalidateTag } from 'next/cache'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { deleteFeatureSchema } from './schema'

export const deleteFeature = superAdminActionClient
  .schema(deleteFeatureSchema)
  .action(async ({ parsedInput: { featureId } }) => {
    const feature = await db.feature.findUnique({
      where: { id: featureId },
      select: {
        _count: { select: { planLimits: true } },
      },
    })

    if (!feature) {
      throw new Error('Feature não encontrada.')
    }

    if (feature._count.planLimits > 0) {
      throw new Error(
        `Não é possível excluir: esta feature possui ${feature._count.planLimits} limite(s) de plano vinculado(s).`,
      )
    }

    await db.feature.delete({ where: { id: featureId } })

    revalidateTag('plan-limits')

    return { success: true }
  })

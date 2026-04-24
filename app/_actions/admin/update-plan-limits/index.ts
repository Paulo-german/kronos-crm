'use server'

import { revalidateTag } from 'next/cache'
import { ownerActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { updatePlanLimitsSchema } from './schema'

export const updatePlanLimits = ownerActionClient
  .schema(updatePlanLimitsSchema)
  .action(async ({ parsedInput: { limits } }) => {
    if (limits.length === 0) {
      throw new Error('Nenhum limite para atualizar.')
    }

    // Buscar todas as features para resolver key → id
    const features = await db.feature.findMany({
      select: { id: true, key: true },
    })

    const featureKeyToId = new Map(features.map((feature) => [feature.key, feature.id]))

    // Atualizar cada limite
    const updates = limits.map((limit) => {
      const featureId = featureKeyToId.get(limit.featureKey)
      if (!featureId) {
        throw new Error(`Feature não encontrada: ${limit.featureKey}`)
      }

      return db.planLimit.update({
        where: {
          planId_featureId: {
            planId: limit.planId,
            featureId,
          },
        },
        data: { valueNumber: limit.valueNumber },
      })
    })

    await Promise.all(updates)

    revalidateTag('plan-limits')

    return { success: true }
  })

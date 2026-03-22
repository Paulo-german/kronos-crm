'use server'

import { revalidateTag } from 'next/cache'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { upsertPlanSchema } from './schema'

export const upsertPlan = superAdminActionClient
  .schema(upsertPlanSchema)
  .action(async ({ parsedInput: data }) => {
    // Resolver feature keys → ids
    const features = await db.feature.findMany({
      select: { id: true, key: true },
    })
    const featureKeyToId = new Map(features.map((feature) => [feature.key, feature.id]))

    const planData = {
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      stripeProductId: data.stripeProductId || null,
      isActive: data.isActive,
    }

    let planId: string

    if (data.id) {
      // Update
      await db.plan.update({ where: { id: data.id }, data: planData })
      planId = data.id
    } else {
      // Create
      const plan = await db.plan.create({ data: planData })
      planId = plan.id
    }

    // Sync modules: remove all + re-create
    await db.planModule.deleteMany({ where: { planId } })
    if (data.moduleIds.length > 0) {
      await db.planModule.createMany({
        data: data.moduleIds.map((moduleId) => ({ planId, moduleId })),
      })
    }

    // Sync limits: remove all + re-create
    await db.planLimit.deleteMany({ where: { planId } })
    const limitsToCreate = data.limits
      .map((limit) => {
        const featureId = featureKeyToId.get(limit.featureKey)
        if (!featureId) return null
        return { planId, featureId, valueNumber: limit.valueNumber }
      })
      .filter((limit): limit is NonNullable<typeof limit> => limit !== null)

    if (limitsToCreate.length > 0) {
      await db.planLimit.createMany({ data: limitsToCreate })
    }

    revalidateTag('plan-limits')

    return { success: true, planId }
  })

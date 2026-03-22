import 'server-only'
import { db } from '@/_lib/prisma'
import type { AdminPlanDetailDto } from './types'

export async function getPlanById(planId: string): Promise<AdminPlanDetailDto | null> {
  const plan = await db.plan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      slug: true,
      name: true,
      stripeProductId: true,
      description: true,
      isActive: true,
      planModules: {
        select: { moduleId: true },
      },
      planLimits: {
        select: {
          valueNumber: true,
          feature: {
            select: { key: true },
          },
        },
      },
    },
  })

  if (!plan) return null

  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    stripeProductId: plan.stripeProductId,
    description: plan.description,
    isActive: plan.isActive,
    moduleIds: plan.planModules.map((planModule) => planModule.moduleId),
    limits: plan.planLimits.map((planLimit) => ({
      featureKey: planLimit.feature.key,
      valueNumber: planLimit.valueNumber,
    })),
  }
}

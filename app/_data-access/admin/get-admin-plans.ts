import 'server-only'
import { db } from '@/_lib/prisma'
import type { AdminPlanDto } from './types'

export async function getAdminPlans(): Promise<AdminPlanDto[]> {
  const plans = await db.plan.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      stripeProductId: true,
      description: true,
      isActive: true,
      planLimits: {
        select: {
          valueNumber: true,
          valueBoolean: true,
          valueString: true,
          feature: {
            select: {
              key: true,
              name: true,
              type: true,
              valueType: true,
            },
          },
        },
        orderBy: { feature: { key: 'asc' } },
      },
      planModules: {
        select: {
          module: {
            select: {
              slug: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          subscriptions: { where: { status: { in: ['active', 'trialing'] } } },
          grantedOrganizations: true,
        },
      },
    },
  })

  return plans.map((plan) => ({
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    stripeProductId: plan.stripeProductId,
    description: plan.description,
    isActive: plan.isActive,
    activeSubscriptions: plan._count.subscriptions,
    grantedOrganizations: plan._count.grantedOrganizations,
    modules: plan.planModules.map((planModule) => ({
      slug: planModule.module.slug,
      name: planModule.module.name,
    })),
    limits: plan.planLimits.map((planLimit) => ({
      featureKey: planLimit.feature.key,
      featureName: planLimit.feature.name,
      featureType: planLimit.feature.type,
      valueType: planLimit.feature.valueType,
      valueNumber: planLimit.valueNumber,
      valueBoolean: planLimit.valueBoolean,
      valueString: planLimit.valueString,
    })),
  }))
}

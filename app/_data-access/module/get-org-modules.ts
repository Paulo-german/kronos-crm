import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { ModuleInfo } from './types'

/**
 * Resolve os módulos ativos da organização via chain:
 * Subscription → Plan → PlanModule → Module
 *
 * Fallback para trial: usa plano "essential".
 */
export const getOrgModules = cache(async (orgId: string): Promise<ModuleInfo[]> => {
  const getCachedModules = unstable_cache(
    async () => {
      // 1. Buscar subscription ativa/trialing
      const subscription = await db.subscription.findFirst({
        where: {
          organizationId: orgId,
          status: { in: ['active', 'trialing'] },
        },
        select: { planId: true },
        orderBy: { createdAt: 'desc' },
      })

      let planId: string | null = subscription?.planId ?? null

      // 2. Fallback: trial da org → plano "essential"
      if (!planId) {
        const org = await db.organization.findUnique({
          where: { id: orgId },
          select: { trialEndsAt: true },
        })

        if (org?.trialEndsAt && org.trialEndsAt > new Date()) {
          const essentialPlan = await db.plan.findUnique({
            where: { slug: 'essential' },
            select: { id: true },
          })
          planId = essentialPlan?.id ?? null
        }
      }

      if (!planId) return []

      // 3. Buscar módulos ativos do plano
      const planModules = await db.planModule.findMany({
        where: { planId },
        include: {
          module: {
            select: { slug: true, name: true, isActive: true },
          },
        },
      })

      return planModules
        .filter((planModule) => planModule.module.isActive)
        .map((planModule) => ({
          slug: planModule.module.slug,
          name: planModule.module.name,
        }))
    },
    [`org-modules-${orgId}`],
    {
      tags: [`modules:${orgId}`, `subscriptions:${orgId}`],
      revalidate: 3600,
    },
  )

  return getCachedModules()
})

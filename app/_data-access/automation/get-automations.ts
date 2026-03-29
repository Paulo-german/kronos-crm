import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import type { AutomationAction, AutomationTrigger } from '@prisma/client'

export interface AutomationListItemDto {
  id: string
  name: string
  description: string | null
  isActive: boolean
  triggerType: AutomationTrigger
  actionType: AutomationAction
  executionCount: number
  lastTriggeredAt: Date | null
  createdAt: Date
  creator: {
    fullName: string | null
  }
}

const fetchAutomationsFromDb = async (orgId: string): Promise<AutomationListItemDto[]> => {
  const automations = await db.automation.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      triggerType: true,
      actionType: true,
      executionCount: true,
      lastTriggeredAt: true,
      createdAt: true,
      creator: {
        select: { fullName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return automations
}

/**
 * Busca todas as automações da organização (Cacheado).
 * RBAC: Apenas ADMIN/OWNER tem acesso — verificado na page/action, sem filtro por userId aqui.
 * cache() do React deduplica chamadas dentro do mesmo request cycle.
 */
export const getAutomations = cache(async (ctx: RBACContext): Promise<AutomationListItemDto[]> => {
  const getCached = unstable_cache(
    async () => fetchAutomationsFromDb(ctx.orgId),
    [`automations-${ctx.orgId}`],
    {
      tags: [`automations:${ctx.orgId}`],
    },
  )

  return getCached()
})

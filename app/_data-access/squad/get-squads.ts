import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { SquadType, SalesDistributionModel } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'

export interface SquadDto {
  id: string
  name: string
  description: string | null
  type: SquadType
  isDefault: boolean
  distributionModel: SalesDistributionModel
  createdAt: Date
  _count: {
    members: number
  }
}

const fetchSquadsFromDb = async (orgId: string): Promise<SquadDto[]> => {
  const squads = await db.squad.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      isDefault: true,
      distributionModel: true,
      createdAt: true,
      _count: {
        select: { members: true },
      },
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })

  return squads.map((squad) => ({
    id: squad.id,
    name: squad.name,
    description: squad.description,
    type: squad.type,
    isDefault: squad.isDefault,
    distributionModel: squad.distributionModel,
    createdAt: squad.createdAt,
    _count: { members: squad._count.members },
  }))
}

/**
 * Lista todos os squads da organização (Cacheado)
 * Squads são entidades organizacionais — todos os membros enxergam a mesma lista.
 */
export const getSquads = cache(async (ctx: RBACContext): Promise<SquadDto[]> => {
  const getCached = unstable_cache(
    async () => fetchSquadsFromDb(ctx.orgId),
    [`squads-${ctx.orgId}`],
    { tags: [`squads:${ctx.orgId}`] },
  )

  return getCached()
})

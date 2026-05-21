import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { SquadType, SalesDistributionModel, SquadRole, MemberRole } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'

export interface SquadMemberDto {
  id: string
  role: SquadRole
  isActive: boolean
  joinedAt: Date
  member: {
    id: string
    email: string
    role: MemberRole
    user: {
      id: string
      fullName: string | null
      avatarUrl: string | null
    } | null
  }
}

export interface SquadDetailDto {
  id: string
  name: string
  description: string | null
  type: SquadType
  isDefault: boolean
  distributionModel: SalesDistributionModel
  loyaltyEnabled: boolean
  createdAt: Date
  members: SquadMemberDto[]
}

const fetchSquadByIdFromDb = async (
  orgId: string,
  squadId: string,
): Promise<SquadDetailDto | null> => {
  const squad = await db.squad.findFirst({
    where: { id: squadId, organizationId: orgId },
    include: {
      members: {
        include: {
          member: {
            select: {
              id: true,
              email: true,
              role: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })

  if (!squad) return null

  return {
    id: squad.id,
    name: squad.name,
    description: squad.description,
    type: squad.type,
    isDefault: squad.isDefault,
    distributionModel: squad.distributionModel,
    loyaltyEnabled: squad.loyaltyEnabled,
    createdAt: squad.createdAt,
    members: squad.members.map((sm) => ({
      id: sm.id,
      role: sm.role,
      isActive: sm.isActive,
      joinedAt: sm.joinedAt,
      member: {
        id: sm.member.id,
        email: sm.member.email,
        role: sm.member.role,
        user: sm.member.user
          ? {
              id: sm.member.user.id,
              fullName: sm.member.user.fullName,
              avatarUrl: sm.member.user.avatarUrl,
            }
          : null,
      },
    })),
  }
}

/**
 * Busca o detalhe de um squad pelo id (Cacheado)
 * Garante que o squad pertence à organização do contexto.
 */
export const getSquadById = cache(async (
  ctx: RBACContext,
  squadId: string,
): Promise<SquadDetailDto | null> => {
  const getCached = unstable_cache(
    async () => fetchSquadByIdFromDb(ctx.orgId, squadId),
    [`squad-${ctx.orgId}-${squadId}`],
    { tags: [`squad:${squadId}`, `squads:${ctx.orgId}`] },
  )

  return getCached()
})

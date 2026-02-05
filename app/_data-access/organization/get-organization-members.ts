import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export const getOrganizationMembers = cache(async (orgId: string) => {
  const getCachedMembers = unstable_cache(
    async () => {
      // Buscar membros ACCEPTED
      const acceptedMembers = await db.member.findMany({
        where: {
          organizationId: orgId,
          status: 'ACCEPTED',
        },
        include: {
          user: {
            select: {
              fullName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      // Buscar membros PENDING (convites)
      const pendingMembers = await db.member.findMany({
        where: {
          organizationId: orgId,
          status: 'PENDING',
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return {
        accepted: acceptedMembers.map((m) => ({
          id: m.id,
          userId: m.userId,
          email: m.email,
          role: m.role,
          status: m.status,
          user: m.user, // Pode ter nome e avatar
          joinedAt: m.updatedAt,
        })),
        pending: pendingMembers.map((m) => ({
          id: m.id,
          email: m.email,
          role: m.role,
          status: m.status,
          invitedAt: m.createdAt,
        })),
      }
    },
    [`org-members-${orgId}`],
    {
      tags: [`org-members:${orgId}`],
      revalidate: 3600,
    },
  )

  return getCachedMembers()
})

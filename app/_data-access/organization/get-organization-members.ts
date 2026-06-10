import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface AcceptedMemberDto {
  id: string
  userId: string | null
  email: string
  role: string
  status: string
  user: {
    fullName: string | null
    avatarUrl: string | null
    phone: string | null
  } | null
  joinedAt: Date
}

export const getOrganizationMembers = cache(async (orgId: string) => {
  const getCachedMembers = unstable_cache(
    async () => {
      const memberSelect = {
        user: {
          select: {
            fullName: true,
            avatarUrl: true,
            phone: true,
          },
        },
      }

      // Buscar membros regulares ACCEPTED (excluindo SUPPORT)
      const acceptedMembers = await db.member.findMany({
        where: {
          organizationId: orgId,
          status: 'ACCEPTED',
          role: { not: 'SUPPORT' },
        },
        include: memberSelect,
        orderBy: { createdAt: 'asc' },
      })

      // Buscar membros regulares PENDING (excluindo SUPPORT)
      const pendingMembers = await db.member.findMany({
        where: {
          organizationId: orgId,
          status: 'PENDING',
          role: { not: 'SUPPORT' },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Buscar agentes de suporte (ACCEPTED + PENDING)
      const supportMembers = await db.member.findMany({
        where: {
          organizationId: orgId,
          role: 'SUPPORT',
        },
        include: memberSelect,
        orderBy: { createdAt: 'desc' },
      })

      return {
        accepted: acceptedMembers.map((member) => ({
          id: member.id,
          userId: member.userId,
          email: member.email,
          role: member.role,
          status: member.status,
          user: member.user,
          joinedAt: member.updatedAt,
        })),
        pending: pendingMembers.map((member) => ({
          id: member.id,
          email: member.email,
          role: member.role,
          status: member.status,
          invitedAt: member.createdAt,
        })),
        support: supportMembers.map((member) => ({
          id: member.id,
          userId: member.userId,
          email: member.email,
          role: member.role,
          status: member.status,
          user: member.user ?? null,
          joinedAt: member.updatedAt,
          invitedAt: member.createdAt,
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

import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface MemberForProfessionalDto {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
}

const fetchAcceptedMembersWithoutProfessional = async (
  orgId: string,
): Promise<MemberForProfessionalDto[]> => {
  const linkedProfessionals = await db.professional.findMany({
    where: { organizationId: orgId, userId: { not: null } },
    select: { userId: true },
  })

  const linkedUserIds = linkedProfessionals
    .map((professional) => professional.userId)
    .filter((userId): userId is string => userId !== null)

  const members = await db.member.findMany({
    where: {
      organizationId: orgId,
      status: 'ACCEPTED',
      userId: linkedUserIds.length > 0
        ? { not: null, notIn: linkedUserIds }
        : { not: null },
    },
    select: {
      email: true,
      userId: true,
      user: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
    },
  })

  return members
    .filter(
      (member): member is typeof member & { userId: string; user: NonNullable<typeof member.user> } =>
        member.userId !== null && member.user !== null,
    )
    .map((member) => ({
      userId: member.userId,
      name: member.user.fullName ?? member.email,
      email: member.email,
      avatarUrl: member.user.avatarUrl,
    }))
}

export const getAcceptedMembersWithoutProfessional = cache(
  async (orgId: string): Promise<MemberForProfessionalDto[]> => {
    const getCached = unstable_cache(
      async () => fetchAcceptedMembersWithoutProfessional(orgId),
      [`accepted-members-without-professional-${orgId}`],
      {
        tags: [`professionals:${orgId}`, `org-members:${orgId}`],
        revalidate: 3600,
      },
    )
    return getCached()
  },
)

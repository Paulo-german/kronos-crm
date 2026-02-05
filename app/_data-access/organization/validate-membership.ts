import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { MemberRole } from '@prisma/client'

interface MembershipValidation {
  isValid: boolean
  orgId: string | null
  userRole: MemberRole | null
}

async function fetchMembership(
  userId: string,
  orgSlug: string,
): Promise<MembershipValidation> {
  const member = await db.member.findFirst({
    where: {
      userId,
      status: 'ACCEPTED',
      organization: {
        slug: orgSlug,
      },
    },
    select: {
      role: true,
      organizationId: true,
    },
  })

  if (!member) {
    return { isValid: false, orgId: null, userRole: null }
  }

  return {
    isValid: true,
    orgId: member.organizationId,
    userRole: member.role,
  }
}

export const validateMembership = cache(
  async (userId: string, orgSlug: string) => {
    const getCachedMembership = unstable_cache(
      async () => fetchMembership(userId, orgSlug),
      [`membership-${userId}-${orgSlug}`],
      {
        tags: [`membership:${userId}:${orgSlug}`, `org-members:${orgSlug}`],
        revalidate: 60 * 60, // 1 hora
      },
    )

    return getCachedMembership()
  },
)

export async function getMembershipOrThrow(userId: string, orgSlug: string) {
  const membership = await validateMembership(userId, orgSlug)

  if (!membership.isValid || !membership.orgId || !membership.userRole) {
    throw new Error('User is not a member of this organization')
  }

  return {
    orgId: membership.orgId,
    userRole: membership.userRole,
  }
}

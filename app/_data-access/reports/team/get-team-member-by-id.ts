import 'server-only'

import { cache } from 'react'
import { db } from '@/_lib/prisma'

export interface TeamMemberBasicInfo {
  id: string
  fullName: string
  avatarUrl: string | null
}

export const getTeamMemberById = cache(
  async (orgId: string, memberId: string): Promise<TeamMemberBasicInfo | null> => {
    const member = await db.user.findFirst({
      where: { id: memberId, memberships: { some: { organizationId: orgId } } },
      select: { id: true, fullName: true, avatarUrl: true },
    })
    if (!member) return null
    return {
      id: member.id,
      fullName: member.fullName ?? '',
      avatarUrl: member.avatarUrl,
    }
  },
)

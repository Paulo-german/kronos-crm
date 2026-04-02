import 'server-only'
import { db } from '@/_lib/prisma'
import type { UserProfileDto } from './types'

// Sem cache — painel admin deve exibir dados sempre frescos (regra MODULE_RULES admin 4.1)

export async function getUserProfileResponses(): Promise<UserProfileDto[]> {
  const profiles = await db.userProfile.findMany({
    where: { profileCompletedAt: { not: null } },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
      organization: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { profileCompletedAt: 'desc' },
  })

  return profiles.map((profile) => ({
    id: profile.id,
    role: profile.role,
    teamSize: profile.teamSize,
    crmExperience: profile.crmExperience,
    mainChallenge: profile.mainChallenge,
    referralSource: profile.referralSource,
    profileCompletedAt: profile.profileCompletedAt,
    user: {
      fullName: profile.user.fullName,
      email: profile.user.email,
    },
    organization: {
      name: profile.organization.name,
      slug: profile.organization.slug,
    },
  }))
}

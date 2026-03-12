import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface OnboardingStatus {
  onboardingCompleted: boolean
  niche: string | null
  hasInbox: boolean
  hasAgent: boolean
}

async function fetchOnboardingStatus(orgId: string): Promise<OnboardingStatus> {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: {
      onboardingCompleted: true,
      niche: true,
      _count: {
        select: {
          inboxes: { where: { channel: 'WHATSAPP' } },
          agents: true,
        },
      },
    },
  })

  return {
    onboardingCompleted: org.onboardingCompleted,
    niche: org.niche,
    hasInbox: org._count.inboxes > 0,
    hasAgent: org._count.agents > 0,
  }
}

export const getOnboardingStatus = cache(async (orgId: string) => {
  const getCached = unstable_cache(
    async () => fetchOnboardingStatus(orgId),
    [`onboarding-status-${orgId}`],
    {
      tags: [`onboarding:${orgId}`],
    },
  )
  return getCached()
})

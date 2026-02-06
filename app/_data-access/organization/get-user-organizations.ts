import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

async function fetchUserOrganizations(userId: string) {
  const memberships = await db.member.findMany({
    where: {
      userId,
      status: 'ACCEPTED',
    },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  return memberships.map((m) => ({
    ...m.organization,
    role: m.role,
  }))
}

export const getUserOrganizations = cache(async (userId: string) => {
  const getCachedOrganizations = unstable_cache(
    async () => fetchUserOrganizations(userId),
    [`user-organizations-${userId}`],
    {
      tags: [`user-orgs:${userId}`],
      revalidate: 3600,
    },
  )
  return getCachedOrganizations()
})

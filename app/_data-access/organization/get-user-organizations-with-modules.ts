import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { getOrgModules } from '@/_data-access/module/get-org-modules'
import type { MemberRole } from '@prisma/client'

export interface OrgWithModules {
  id: string
  name: string
  slug: string
  role: MemberRole
  grantType: string | null
  activeModules: string[]
}

async function fetchUserOrganizationsWithModules(userId: string): Promise<OrgWithModules[]> {
  const memberships = await db.member.findMany({
    where: {
      userId,
      status: 'ACCEPTED',
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          grantType: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const orgsWithModules = await Promise.all(
    memberships.map(async (m) => {
      const modules = await getOrgModules(m.organization.id)
      return {
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
        grantType: m.organization.grantType ?? null,
        activeModules: modules.map((mod) => mod.slug),
      }
    }),
  )

  return orgsWithModules
}

export const getUserOrganizationsWithModules = cache(async (userId: string): Promise<OrgWithModules[]> => {
  const getCached = unstable_cache(
    async () => fetchUserOrganizationsWithModules(userId),
    [`user-orgs-with-modules-${userId}`],
    {
      tags: [`user-orgs-with-modules:${userId}`],
      revalidate: 3600,
    },
  )
  return getCached()
})

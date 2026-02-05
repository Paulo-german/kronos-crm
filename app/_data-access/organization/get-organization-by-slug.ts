import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

async function fetchOrganizationBySlug(slug: string) {
  return db.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
    },
  })
}

export const getOrganizationBySlug = cache(async (slug: string) => {
  const getCachedOrganization = unstable_cache(
    async () => fetchOrganizationBySlug(slug),
    [`organization-slug-${slug}`],
    {
      tags: [`organization:${slug}`],
      revalidate: 3600,
    },
  )
  return getCachedOrganization()
})

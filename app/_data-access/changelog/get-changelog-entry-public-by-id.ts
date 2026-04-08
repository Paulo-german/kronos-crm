import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { ChangelogEntryPublicDto } from './types'

const fetchPublicEntryFromDb = async (
  id: string,
): Promise<ChangelogEntryPublicDto | null> => {
  const entry = await db.changelogEntry.findUnique({
    where: { id, isPublished: true },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      publishedAt: true,
    },
  })

  if (!entry || !entry.publishedAt) return null

  return { ...entry, publishedAt: entry.publishedAt }
}

export const getChangelogEntryPublicById = cache(
  async (id: string): Promise<ChangelogEntryPublicDto | null> => {
    const getCached = unstable_cache(
      async () => fetchPublicEntryFromDb(id),
      [`changelog-entry-public-${id}`],
      { tags: ['changelog:public'] },
    )
    return getCached()
  },
)

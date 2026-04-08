import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { ChangelogEntryPublicDto } from './types'

/**
 * Busca entradas publicadas no banco, ordenadas por publishedAt DESC.
 * Retorna apenas entradas com isPublished=true, por isso publishedAt é sempre preenchido.
 */
const fetchPublicEntriesFromDb = async (): Promise<ChangelogEntryPublicDto[]> => {
  const entries = await db.changelogEntry.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      publishedAt: true,
    },
  })

  // publishedAt é sempre não-nulo aqui pois filtramos isPublished=true,
  // mas o Prisma infere DateTime? pelo schema. Filtramos entradas sem data
  // (situação impossível em dados íntegros) para satisfazer o TypeScript.
  return entries
    .filter((entry): entry is typeof entry & { publishedAt: Date } => entry.publishedAt !== null)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      type: entry.type,
      publishedAt: entry.publishedAt,
    }))
}

/**
 * Retorna todas as entradas publicadas do changelog para a página pública.
 * Cache duplo: React cache() dedup por request + Next.js unstable_cache com tag changelog:public.
 * Invalidado ativamente em toda mutação admin via revalidateTag('changelog:public').
 */
export const getChangelogEntriesPublic = cache(async (): Promise<ChangelogEntryPublicDto[]> => {
  const getCached = unstable_cache(
    async () => fetchPublicEntriesFromDb(),
    ['changelog-public'],
    {
      tags: ['changelog:public'],
      revalidate: 3600,
    },
  )

  return getCached()
})

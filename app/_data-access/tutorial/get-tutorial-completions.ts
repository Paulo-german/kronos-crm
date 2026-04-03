import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

const fetchTutorialCompletionsFromDb = async (userId: string, orgId: string): Promise<string[]> => {
  const completions = await db.tutorialCompletion.findMany({
    where: { userId, organizationId: orgId },
    select: { tutorialId: true },
  })

  return completions.map((completion) => completion.tutorialId)
}

/**
 * Retorna os IDs dos tutoriais que o usuário já completou nesta organização.
 * Cache de 1h — tutoriais são completados poucas vezes (dado muda raramente).
 * A tag inclui userId para garantir isolamento entre usuários da mesma org.
 */
export const getTutorialCompletions = cache(async (userId: string, orgId: string): Promise<string[]> => {
  const getCached = unstable_cache(
    async () => fetchTutorialCompletionsFromDb(userId, orgId),
    [`tutorial-completions-${userId}-${orgId}`],
    {
      tags: [`tutorials:${userId}:${orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
})

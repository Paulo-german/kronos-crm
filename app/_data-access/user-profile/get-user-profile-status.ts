import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

const fetchUserProfileStatus = async (userId: string): Promise<boolean> => {
  const result = await db.userProfile.findUnique({
    where: { userId },
    select: { profileCompletedAt: true },
  })

  return !!result?.profileCompletedAt
}

/**
 * Verifica se o usuário já completou o survey de boas-vindas.
 * Usado no layout (main) para decidir se exibe o modal bloqueante.
 * Cache de 1h pois o status muda no máximo 1 vez por usuário (quando completa o survey).
 */
export const getUserProfileStatus = cache(async (userId: string): Promise<boolean> => {
  const getCached = unstable_cache(
    async () => fetchUserProfileStatus(userId),
    [`user-profile-status-${userId}`],
    {
      tags: [`user-profile:${userId}`],
      revalidate: 3600,
    },
  )

  return getCached()
})

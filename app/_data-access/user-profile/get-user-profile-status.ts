import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

const fetchUserProfileStatus = async (userId: string, orgId: string): Promise<boolean> => {
  const result = await db.userProfile.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    select: { profileCompletedAt: true },
  })

  return !!result?.profileCompletedAt
}

/**
 * Verifica se o usuário já completou o survey de boas-vindas para esta organização.
 * Usado no layout (main) para decidir se exibe o modal.
 * Cache de 1h pois o status muda no máximo 1 vez por par usuário+org.
 */
export const getUserProfileStatus = cache(async (userId: string, orgId: string): Promise<boolean> => {
  const getCached = unstable_cache(
    async () => fetchUserProfileStatus(userId, orgId),
    [`user-profile-status-${userId}-${orgId}`],
    {
      tags: [`user-profile:${userId}:${orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
})

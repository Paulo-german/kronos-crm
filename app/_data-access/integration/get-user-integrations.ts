import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { UserIntegrationDto } from './types'

const fetchUserIntegrationsFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<UserIntegrationDto[]> => {
  const integrations = await db.userIntegration.findMany({
    where: {
      organizationId: orgId,
      // RBAC: MEMBER só vê suas próprias integrações
      ...(elevated ? {} : { userId }),
    },
    select: {
      id: true,
      provider: true,
      status: true,
      providerAccountId: true,
      lastSyncAt: true,
      syncError: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return integrations
}

/**
 * Busca todas as integrações do usuário/org (Cacheado).
 * RBAC: MEMBER só vê suas próprias integrações. ADMIN/OWNER veem todas da org.
 * Nunca retorna tokens — apenas DTO com status público.
 */
export const getUserIntegrations = async (ctx: RBACContext): Promise<UserIntegrationDto[]> => {
  const elevated = isElevated(ctx.userRole)

  const getCached = unstable_cache(
    async () => fetchUserIntegrationsFromDb(ctx.orgId, ctx.userId, elevated),
    [`user-integrations-${ctx.orgId}-${ctx.userId}`],
    {
      tags: [`integrations:${ctx.orgId}`],
      revalidate: 120,
    },
  )

  return getCached()
}

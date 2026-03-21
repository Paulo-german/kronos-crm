import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { UserIntegrationDto } from './types'

const fetchIntegrationByIdFromDb = async (
  integrationId: string,
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<UserIntegrationDto | null> => {
  const integration = await db.userIntegration.findFirst({
    where: {
      id: integrationId,
      organizationId: orgId,
      // RBAC: MEMBER só acessa a própria integração
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
  })

  return integration
}

/**
 * Busca uma integração específica por ID (Cacheado).
 * RBAC: MEMBER só acessa integrações atribuídas a ele.
 */
export const getIntegrationById = async (
  integrationId: string,
  ctx: RBACContext,
): Promise<UserIntegrationDto | null> => {
  const elevated = isElevated(ctx.userRole)

  const getCached = unstable_cache(
    async () => fetchIntegrationByIdFromDb(integrationId, ctx.orgId, ctx.userId, elevated),
    [`integration-${integrationId}-${ctx.userId}`],
    {
      tags: [`integrations:${ctx.orgId}`, `integration:${integrationId}`],
    },
  )

  return getCached()
}

import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { ConnectionType } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { ALLOWED_BROADCAST_CONNECTIONS } from '@/_actions/broadcast/schema'

export interface EligibleInbox {
  id: string
  name: string
  connectionType: ConnectionType
}

const fetchEligibleInboxesFromDb = async (
  orgId: string,
): Promise<EligibleInbox[]> => {
  return db.inbox.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      // Só provedores externos da whitelist suportam disparo em massa
      connectionType: { in: [...ALLOWED_BROADCAST_CONNECTIONS] },
    },
    select: { id: true, name: true, connectionType: true },
    orderBy: { name: 'asc' },
  })
}

/**
 * Lista as inboxes elegíveis para disparo em massa (Cacheado).
 * Não retorna credenciais. Tag compartilhada com as inboxes normais.
 */
export const getEligibleInboxes = async (
  ctx: RBACContext,
): Promise<EligibleInbox[]> => {
  const getCached = unstable_cache(
    async () => fetchEligibleInboxesFromDb(ctx.orgId),
    [`broadcast-eligible-inboxes-${ctx.orgId}`],
    {
      tags: [`inboxes:${ctx.orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

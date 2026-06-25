import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { ConnectionType } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { BROADCAST_ELIGIBLE_WHERE } from '@/_lib/whatsapp/broadcast-eligibility'

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
      // Só canais selfhosted reais (Evolution Go ou Evolution com servidor próprio)
      ...BROADCAST_ELIGIBLE_WHERE,
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

import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

export type DealOptionDto = {
  id: string
  title: string
  contactName: string | null
}

const fetchDealsOptionsFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<DealOptionDto[]> => {
  const deals = await db.deal.findMany({
    where: {
      organizationId: orgId,
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      ...(elevated ? {} : { assignedTo: userId }),
    },
    select: {
      id: true,
      title: true,
      contacts: {
        select: {
          contact: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 50,
  })

  return deals.map((deal) => ({
    id: deal.id,
    title: deal.title,
    contactName: deal.contacts?.[0]?.contact?.name ?? null,
  }))
}

/**
 * Busca deals ativos para uso em selects/comboboxes (Cacheado)
 * RBAC: MEMBER só vê deals atribuídos a ele
 */
export const getDealsOptions = async (
  ctx: RBACContext,
): Promise<DealOptionDto[]> => {
  const elevated = isElevated(ctx.userRole)

  const getCached = unstable_cache(
    async () => fetchDealsOptionsFromDb(ctx.orgId, ctx.userId, elevated),
    [`deals-options-${ctx.orgId}-${ctx.userId}`],
    {
      tags: [`deals-options:${ctx.orgId}`],
    },
  )

  return getCached()
}

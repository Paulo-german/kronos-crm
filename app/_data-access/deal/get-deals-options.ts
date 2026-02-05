import 'server-only'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

export type DealOptionDto = {
  id: string
  title: string
  contactName: string | null
}

/**
 * Busca deals ativos para uso em selects/comboboxes
 * RBAC: MEMBER só vê deals atribuídos a ele
 */
export const getDealsOptions = async (
  ctx: RBACContext,
): Promise<DealOptionDto[]> => {
  const deals = await db.deal.findMany({
    where: {
      organizationId: ctx.orgId,
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      // RBAC: MEMBER só vê próprios, ADMIN/OWNER vê todos
      ...(isElevated(ctx.userRole) ? {} : { assignedTo: ctx.userId }),
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

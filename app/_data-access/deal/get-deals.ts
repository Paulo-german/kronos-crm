import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { DealStatus, DealPriority } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

export interface DealListDto {
  id: string
  title: string
  stageId: string
  stageName: string
  status: DealStatus
  priority: DealPriority
  contactId: string | null
  contactName: string | null
  companyId: string | null
  companyName: string | null
  expectedCloseDate: Date | null
  totalValue: number
  notes: string | null
  assignedTo: string
  assigneeName: string | null
  createdAt: Date
}

const fetchDealsFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<DealListDto[]> => {
  const deals = await db.deal.findMany({
    where: {
      organizationId: orgId,
      ...(elevated ? {} : { assignedTo: userId }),
    },
    include: {
      stage: {
        select: { name: true },
      },
      contacts: {
        orderBy: { isPrimary: 'desc' },
        take: 1,
        include: {
          contact: {
            select: { name: true },
          },
        },
      },
      company: {
        select: { name: true },
      },
      dealProducts: {
        select: {
          unitPrice: true,
          quantity: true,
          discountType: true,
          discountValue: true,
        },
      },
      assignee: {
        select: { fullName: true, email: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return deals.map((deal) => {
    const totalValue = deal.dealProducts.reduce((sum, dp) => {
      const subtotal = Number(dp.unitPrice) * dp.quantity
      let discount = 0

      if (dp.discountValue) {
        discount =
          dp.discountType === 'percentage'
            ? subtotal * (Number(dp.discountValue) / 100)
            : Number(dp.discountValue)
      }

      return sum + (subtotal - discount)
    }, 0)

    const primaryLink = deal.contacts[0]
    const contactName = primaryLink?.contact?.name ?? null
    const contactId = primaryLink?.contactId ?? null

    return {
      id: deal.id,
      title: deal.title,
      stageId: deal.pipelineStageId,
      stageName: deal.stage.name,
      status: deal.status,
      priority: deal.priority,
      contactId,
      contactName,
      companyId: deal.companyId,
      companyName: deal.company?.name ?? null,
      expectedCloseDate: deal.expectedCloseDate,
      totalValue,
      notes: deal.notes,
      assignedTo: deal.assignedTo,
      assigneeName: deal.assignee?.fullName ?? deal.assignee?.email ?? null,
      createdAt: deal.createdAt,
    }
  })
}

/**
 * Busca todos os deals da organização em formato flat (lista)
 * RBAC: MEMBER só vê deals atribuídos a ele
 */
export const getDeals = async (ctx: RBACContext): Promise<DealListDto[]> => {
  const elevated = isElevated(ctx.userRole)

  const getCached = unstable_cache(
    async () => fetchDealsFromDb(ctx.orgId, ctx.userId, elevated),
    [`deals-${ctx.orgId}-${ctx.userId}`],
    {
      tags: [`deals:${ctx.orgId}`],
    },
  )

  return getCached()
}

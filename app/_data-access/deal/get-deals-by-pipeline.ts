import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { DealStatus, DealPriority } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

export interface DealDto {
  id: string
  title: string
  stageId: string
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
  createdAt: Date
}

export interface DealsByStageDto {
  [stageId: string]: DealDto[]
}

const fetchDealsByPipelineFromDb = async (
  stageIds: string[],
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<DealsByStageDto> => {
  const result: DealsByStageDto = stageIds.reduce((acc, stageId) => {
    acc[stageId] = []
    return acc
  }, {} as DealsByStageDto)

  const deals = await db.deal.findMany({
    where: {
      pipelineStageId: { in: stageIds },
      organizationId: orgId,
      ...(elevated ? {} : { assignedTo: userId }),
    },
    include: {
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
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  for (const deal of deals) {
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

    if (result[deal.pipelineStageId]) {
      result[deal.pipelineStageId].push({
        id: deal.id,
        title: deal.title,
        stageId: deal.pipelineStageId,
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
        createdAt: deal.createdAt,
      })
    }
  }

  return result
}

/**
 * Busca todos os deals de um pipeline agrupados por stage (Cacheado)
 * RBAC: MEMBER só vê deals atribuídos a ele
 */
export const getDealsByPipeline = async (
  stageIds: string[],
  ctx: RBACContext,
): Promise<DealsByStageDto> => {
  if (stageIds.length === 0) return {}

  const elevated = isElevated(ctx.userRole)

  const getCached = unstable_cache(
    async () => fetchDealsByPipelineFromDb(stageIds, ctx.orgId, ctx.userId, elevated),
    [`deals-by-pipeline-${ctx.orgId}-${ctx.userId}`],
    {
      tags: [`deals:${ctx.orgId}`],
    },
  )

  return getCached()
}

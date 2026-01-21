import 'server-only'
import { db } from '@/_lib/prisma'

export interface DealDto {
  id: string
  title: string
  stageId: string
  status: 'OPEN' | 'WON' | 'LOST' | 'PAUSED'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  contactId: string | null
  contactName: string | null
  companyId: string | null
  companyName: string | null
  expectedCloseDate: Date | null
  totalValue: number
  notes: string | null
  createdAt: Date
}

export interface DealsByStageDto {
  [stageId: string]: DealDto[]
}

/**
 * Busca todos os deals do pipeline agrupados por stageId
 * Multi-tenancy via pipeline.createdBy
 */
export const getDealsByPipeline = async (
  stageIds: string[],
): Promise<DealsByStageDto> => {
  if (stageIds.length === 0) return {}

  // Busca todos os deals das etapas deste pipeline
  const deals = await db.deal.findMany({
    where: {
      pipelineStageId: {
        in: stageIds,
      },
    },
    include: {
      contact: {
        select: { name: true },
      },
      company: {
        select: { name: true },
      },
      dealProducts: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Agrupa por stageId e calcula valor total
  const result: DealsByStageDto = {}

  // Inicializa todas as stages com arrays vazios
  for (const stageId of stageIds) {
    result[stageId] = []
  }

  for (const deal of deals) {
    // Calcula valor total do deal baseado nos produtos
    const totalValue = deal.dealProducts.reduce((sum, dp) => {
      const subtotal = Number(dp.unitPrice) * dp.quantity
      const discount =
        dp.discountType === 'percentage'
          ? subtotal * (Number(dp.discountValue) / 100)
          : Number(dp.discountValue)
      return sum + (subtotal - discount)
    }, 0)

    result[deal.pipelineStageId].push({
      id: deal.id,
      title: deal.title,
      stageId: deal.pipelineStageId,
      status: deal.status,
      priority: deal.priority,
      contactId: deal.contactId,
      contactName: deal.contact?.name ?? null,
      companyId: deal.companyId,
      companyName: deal.company?.name ?? null,
      expectedCloseDate: deal.expectedCloseDate,
      totalValue,
      notes: deal.notes,
      createdAt: deal.createdAt,
    })
  }

  return result
}

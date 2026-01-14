import 'server-only'
import { db } from '@/_lib/prisma'

export interface DealDto {
  id: string
  title: string
  stageId: string
  contactId: string | null
  contactName: string | null
  companyId: string | null
  companyName: string | null
  expectedCloseDate: Date | null
  totalValue: number
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
  pipelineId: string,
  userId: string,
): Promise<DealsByStageDto> => {
  // Verifica ownership do pipeline
  const pipeline = await db.pipeline.findFirst({
    where: {
      id: pipelineId,
      createdBy: userId,
    },
    include: {
      stages: {
        select: { id: true },
      },
    },
  })

  if (!pipeline) return {}

  // Busca todos os deals das etapas deste pipeline
  const deals = await db.deal.findMany({
    where: {
      pipelineStageId: {
        in: pipeline.stages.map((s) => s.id),
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
  for (const stage of pipeline.stages) {
    result[stage.id] = []
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
      contactId: deal.contactId,
      contactName: deal.contact?.name ?? null,
      companyId: deal.companyId,
      companyName: deal.company?.name ?? null,
      expectedCloseDate: deal.expectedCloseDate,
      totalValue,
      createdAt: deal.createdAt,
    })
  }

  return result
}

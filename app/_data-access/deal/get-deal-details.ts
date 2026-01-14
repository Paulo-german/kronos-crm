import 'server-only'
import { db } from '@/_lib/prisma'

export interface DealProductDto {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discountType: 'percentage' | 'fixed'
  discountValue: number
  subtotal: number
}

export interface DealActivityDto {
  id: string
  type: string // note | call | email | meeting | stage_change | product_added | product_removed | task_created | task_completed
  content: string
  createdAt: Date
}

export interface DealTaskDto {
  id: string
  title: string
  dueDate: Date | null
  isCompleted: boolean
}

export interface DealDetailsDto {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  notes: string | null
  expectedCloseDate: Date | null
  createdAt: Date
  updatedAt: Date
  // Stage info
  stageId: string
  stageName: string
  stageColor: string | null
  // Pipeline info
  pipelineId: string
  wonStageId: string | null
  lostStageId: string | null
  // Contact & Company
  contactId: string | null
  contactName: string | null
  companyId: string | null
  companyName: string | null
  // Calculated
  totalValue: number
  // Related data
  products: DealProductDto[]
  activities: DealActivityDto[]
  tasks: DealTaskDto[]
}

export const getDealDetails = async (
  dealId: string,
  userId: string,
): Promise<DealDetailsDto | null> => {
  const deal = await db.deal.findFirst({
    where: {
      id: dealId,
      stage: {
        pipeline: {
          createdBy: userId,
        },
      },
    },
    include: {
      stage: {
        include: {
          pipeline: {
            select: {
              id: true,
              wonStageId: true,
              lostStageId: true,
            },
          },
        },
      },
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
      activities: {
        orderBy: { createdAt: 'desc' },
      },
      tasks: {
        orderBy: { dueDate: 'asc' },
      },
    },
  })

  if (!deal) return null

  // Calculate products with subtotals
  const products: DealProductDto[] = deal.dealProducts.map((dp) => {
    const subtotal = Number(dp.unitPrice) * dp.quantity
    const discount =
      dp.discountType === 'percentage'
        ? subtotal * (Number(dp.discountValue) / 100)
        : Number(dp.discountValue)

    return {
      id: dp.id,
      productId: dp.productId,
      productName: dp.product.name,
      quantity: dp.quantity,
      unitPrice: Number(dp.unitPrice),
      discountType: dp.discountType as 'percentage' | 'fixed',
      discountValue: Number(dp.discountValue),
      subtotal: subtotal - discount,
    }
  })

  const totalValue = products.reduce((sum, p) => sum + p.subtotal, 0)

  return {
    id: deal.id,
    title: deal.title,
    priority: deal.priority,
    notes: deal.notes,
    expectedCloseDate: deal.expectedCloseDate,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    stageId: deal.pipelineStageId,
    stageName: deal.stage.name,
    stageColor: deal.stage.color,
    pipelineId: deal.stage.pipeline.id,
    wonStageId: deal.stage.pipeline.wonStageId,
    lostStageId: deal.stage.pipeline.lostStageId,
    contactId: deal.contactId,
    contactName: deal.contact?.name ?? null,
    companyId: deal.companyId,
    companyName: deal.company?.name ?? null,
    totalValue,
    products,
    activities: deal.activities.map((a) => ({
      id: a.id,
      type: a.type,
      content: a.content,
      createdAt: a.createdAt,
    })),
    tasks: deal.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      isCompleted: t.isCompleted,
    })),
  }
}

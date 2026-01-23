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

export interface PipelineStageDto {
  id: string
  name: string
  position: number
  color: string | null
}

export interface DealDetailsDto {
  id: string
  title: string
  status: 'OPEN' | 'IN_PROGRESS' | 'WON' | 'LOST' | 'PAUSED'
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
  availableStages: PipelineStageDto[]
  // Contact (detailed)
  contactId: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  contactRole: string | null
  // Company (detailed)
  companyId: string | null
  companyName: string | null
  companyDomain: string | null
  companyIndustry: string | null
  // Assignee
  assigneeId: string
  assigneeName: string | null
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
              stages: {
                orderBy: {
                  position: 'asc',
                },
              },
            },
          },
        },
      },
      contact: {
        select: {
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      company: {
        select: {
          name: true,
          domain: true,
          industry: true,
        },
      },
      assignee: {
        select: {
          fullName: true,
        },
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
    status: deal.status,
    priority: deal.priority,
    notes: deal.notes,
    expectedCloseDate: deal.expectedCloseDate,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    stageId: deal.pipelineStageId,
    stageName: deal.stage.name,
    stageColor: deal.stage.color,
    pipelineId: deal.stage.pipeline.id,
    availableStages: deal.stage.pipeline.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      position: stage.position,
      color: stage.color,
    })),
    contactId: deal.contactId,
    contactName: deal.contact?.name ?? null,
    contactEmail: deal.contact?.email ?? null,
    contactPhone: deal.contact?.phone ?? null,
    contactRole: deal.contact?.role ?? null,
    companyId: deal.companyId,
    companyName: deal.company?.name ?? null,
    companyDomain: deal.company?.domain ?? null,
    companyIndustry: deal.company?.industry ?? null,
    assigneeId: deal.assignedTo,
    assigneeName: deal.assignee?.fullName ?? null,
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

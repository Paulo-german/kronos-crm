import 'server-only'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

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
  type: string
  content: string
  createdAt: Date
}

export interface DealTaskDto {
  id: string
  title: string
  type: string
  dueDate: Date | null
  isCompleted: boolean
  dealId: string
}

export interface PipelineStageDto {
  id: string
  name: string
  position: number
  color: string | null
}

export interface DealContactDto {
  contactId: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  isPrimary: boolean
  contactOriginalRole: string | null
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
  stageId: string
  stageName: string
  stageColor: string | null
  pipelineId: string
  availableStages: PipelineStageDto[]
  contacts: DealContactDto[]
  companyId: string | null
  companyName: string | null
  companyDomain: string | null
  companyIndustry: string | null
  assigneeId: string
  assigneeName: string | null
  totalValue: number
  products: DealProductDto[]
  activities: DealActivityDto[]
  tasks: DealTaskDto[]
}

/**
 * Busca detalhes completos de um deal
 * RBAC: MEMBER só vê deals atribuídos a ele
 */
export const getDealDetails = async (
  dealId: string,
  ctx: RBACContext,
): Promise<DealDetailsDto | null> => {
  const deal = await db.deal.findFirst({
    where: {
      id: dealId,
      organizationId: ctx.orgId,
      // RBAC: MEMBER só vê próprios, ADMIN/OWNER vê todos
      ...(isElevated(ctx.userRole) ? {} : { assignedTo: ctx.userId }),
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
      contacts: {
        include: {
          contact: true,
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
    contacts: deal.contacts.map((dc) => ({
      contactId: dc.contactId,
      name: dc.contact.name,
      email: dc.contact.email,
      phone: dc.contact.phone,
      role: dc.contact.role,
      isPrimary: dc.isPrimary,
      contactOriginalRole: dc.role,
    })),
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
      type: t.type,
      dueDate: t.dueDate,
      isCompleted: t.isCompleted,
      dealId: deal.id,
    })),
  }
}

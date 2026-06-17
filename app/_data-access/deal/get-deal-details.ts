import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { maskEmail, maskPhone } from '@/_lib/pii-mask'

export interface DealLineItemDto {
  id: string
  itemType: 'PRODUCT' | 'SERVICE' | 'PROMOTION'
  product?: { id: string; name: string }
  service?: { id: string; name: string; duration: number }
  promotion?: { id: string; name: string }
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
  performer: {
    fullName: string | null
    avatarUrl: string | null
  } | null
  metadata: Record<string, unknown> | null
}

export interface DealTaskDto {
  id: string
  title: string
  type: string
  dueDate: Date
  isCompleted: boolean
  dealId: string
  outcomeType: string | null
  outcomeNotes: string | null
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
  lossReasonId: string | null
  lossReasonName: string | null
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
  activities: DealActivityDto[]
  totalActivities: number
  /**
   * Contadores para os badges das abas. Os dados completos de cada aba
   * (line items, tasks, appointments) são carregados sob demanda por seus
   * próprios data-access — ver getDealLineItems / getDealTasks / getDealAppointments.
   */
  counts: {
    lineItems: number
    tasks: number
    appointments: number
  }
}

const fetchDealDetailsFromDb = async (
  dealId: string,
  orgId: string,
  userId: string,
  elevated: boolean,
  hidePiiFromMembers: boolean,
): Promise<DealDetailsDto | null> => {
  const deal = await db.deal.findFirst({
    where: {
      id: dealId,
      organizationId: orgId,
      ...(elevated ? {} : { assignedTo: userId }),
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
      // Apenas escalares: o suficiente para computar o totalValue do Resumo.
      // Os itens completos (com nomes) vêm de getDealLineItems na aba Produtos.
      lineItems: {
        select: {
          unitPrice: true,
          quantity: true,
          discountType: true,
          discountValue: true,
        },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          performer: {
            select: {
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      },
      _count: {
        select: {
          activities: true,
          lineItems: true,
          tasks: true,
          appointments: true,
        },
      },
      lossReason: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!deal) return null

  const masked = !elevated && hidePiiFromMembers

  // Soma dos subtotais a partir dos escalares (mesma regra de desconto da aba Produtos).
  const totalValue = deal.lineItems.reduce((sum, item) => {
    const gross = Number(item.unitPrice) * item.quantity
    const discount =
      item.discountType === 'percentage'
        ? gross * (Number(item.discountValue) / 100)
        : Number(item.discountValue)
    return sum + (gross - discount)
  }, 0)

  return {
    id: deal.id,
    title: deal.title,
    status: deal.status,
    priority: deal.priority,
    notes: deal.notes,
    lossReasonId: deal.lossReasonId,
    lossReasonName: deal.lossReason?.name ?? null,
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
      email: masked ? maskEmail(dc.contact.email) : dc.contact.email,
      phone: masked ? maskPhone(dc.contact.phone) : dc.contact.phone,
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
    activities: deal.activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      content: activity.content,
      createdAt: activity.createdAt,
      performer: activity.performer,
      metadata: (activity.metadata as Record<string, unknown>) ?? null,
    })),
    totalActivities: deal._count.activities,
    counts: {
      lineItems: deal._count.lineItems,
      tasks: deal._count.tasks,
      appointments: deal._count.appointments,
    },
  }
}

/**
 * Busca detalhes completos de um deal (Cacheado)
 * RBAC: MEMBER só vê deals atribuídos a ele
 */
export const getDealDetails = cache(
  async (dealId: string, ctx: RBACContext): Promise<DealDetailsDto | null> => {
    const elevated = isElevated(ctx.userRole)
    const hidePiiFromMembers = ctx.hidePiiFromMembers ?? false

    const getCached = unstable_cache(
      async () =>
        fetchDealDetailsFromDb(
          dealId,
          ctx.orgId,
          ctx.userId,
          elevated,
          hidePiiFromMembers,
        ),
      [
        `deal-details-${dealId}-${ctx.userId}-${elevated}-${hidePiiFromMembers}`,
      ],
      {
        tags: [`deal:${dealId}`, `deals:${ctx.orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)

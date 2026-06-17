import 'server-only'
import { DealStatus, DealPriority } from '@prisma/client'
import type { Prisma } from '@prisma/client'

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
  lastActivityAt: Date | null
  taskCount: number
  appointmentCount: number
  conversationCount: number
}

export interface DealsByStageDto {
  [stageId: string]: DealDto[]
}

/**
 * Include + mapper compartilhados pela paginação por coluna do Kanban
 * (get-deals-by-pipeline-stage). Centralizados aqui para que o DealDto seja
 * montado de forma idêntica onde quer que os cards sejam carregados.
 */
export const dealKanbanInclude = {
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
  _count: {
    select: { tasks: true, appointments: true, conversations: true },
  },
  // Última atividade para calcular dias de inatividade no card do Kanban
  activities: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { createdAt: true },
  },
} satisfies Prisma.DealInclude

type DealWithKanbanInclude = Prisma.DealGetPayload<{
  include: typeof dealKanbanInclude
}>

export const mapDealToDto = (deal: DealWithKanbanInclude): DealDto => {
  const primaryLink = deal.contacts[0]
  return {
    id: deal.id,
    title: deal.title,
    stageId: deal.pipelineStageId,
    status: deal.status,
    priority: deal.priority,
    contactId: primaryLink?.contactId ?? null,
    contactName: primaryLink?.contact?.name ?? null,
    companyId: deal.companyId,
    companyName: deal.company?.name ?? null,
    expectedCloseDate: deal.expectedCloseDate,
    totalValue: Number(deal.value ?? 0),
    notes: deal.notes,
    assignedTo: deal.assignedTo,
    createdAt: deal.createdAt,
    lastActivityAt: deal.activities[0]?.createdAt ?? null,
    taskCount: deal._count.tasks,
    appointmentCount: deal._count.appointments,
    conversationCount: deal._count.conversations,
  }
}

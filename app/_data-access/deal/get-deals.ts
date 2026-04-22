import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { DealStatus, DealPriority } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildDealWhereClause } from './build-deal-where-clause'

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
    [`deals-${ctx.orgId}-${ctx.userId}-${elevated}`],
    {
      tags: [`deals:${ctx.orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

// ─────────────────────────────────────────────────────────────
// Interfaces para consulta paginada de deals (list view)
// ─────────────────────────────────────────────────────────────

export interface DealListParams {
  page: number
  pageSize: number
  sort: 'created-desc' | 'created-asc' | 'value-desc' | 'value-asc' | 'priority-desc' | 'title-asc'
  search: string
  status: DealStatus[]
  priority: DealPriority[]
  /** Filtro manual de responsável — só é aplicado para ADMIN/OWNER (elevated). MEMBER ignora este campo. */
  assignedTo?: string
  dateFrom?: string
  dateTo?: string
  valueMin?: number
  valueMax?: number
  /** Filtra deals cuja stage pertença ao pipeline indicado. Omitido = todos os pipelines. */
  pipelineId?: string
}

export interface DealListResult {
  data: DealListDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Mapeamento das opções de ordenação para colunas do banco
const DEAL_SORT_MAP: Record<DealListParams['sort'], Prisma.DealOrderByWithRelationInput> = {
  'created-desc': { createdAt: 'desc' },
  'created-asc': { createdAt: 'asc' },
  'value-desc': { value: 'desc' },
  'value-asc': { value: 'asc' },
  'priority-desc': { priority: 'desc' },
  'title-asc': { title: 'asc' },
}

// ─────────────────────────────────────────────────────────────
// Função base paginada (sem cache) — usada por getDealsPaginated
// ─────────────────────────────────────────────────────────────
const fetchDealsPaginatedFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
  params: DealListParams,
): Promise<DealListResult> => {
  const orderBy = DEAL_SORT_MAP[params.sort]

  const where = buildDealWhereClause({
    orgId,
    userId,
    elevated,
    search: params.search,
    status: params.status.length > 0 ? params.status : undefined,
    priority: params.priority.length > 0 ? params.priority : undefined,
    assignedTo: elevated ? params.assignedTo : undefined,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    valueMin: params.valueMin,
    valueMax: params.valueMax,
    pipelineId: params.pipelineId,
  })

  // Executa count e findMany em paralelo para eficiência
  const [total, deals] = await Promise.all([
    db.deal.count({ where }),
    db.deal.findMany({
      where,
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
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ])

  const data = deals.map((deal) => {
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
    } satisfies DealListDto
  })

  return {
    data,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  }
}

/**
 * Busca deals com paginação, filtros e ordenação server-side (Cacheado)
 * RBAC: MEMBER só vê deals atribuídos a ele
 *
 * Cache key inclui todos os parâmetros para garantir entradas distintas por combinação de filtros.
 * Tag compartilhada deals:${orgId} garante invalidação correta em qualquer mutação de deal.
 */
export const getDealsPaginated = async (
  ctx: RBACContext,
  params: DealListParams,
): Promise<DealListResult> => {
  const elevated = isElevated(ctx.userRole)

  // Serializa params para cache key determinística
  const paramsKey = JSON.stringify({
    page: params.page,
    pageSize: params.pageSize,
    sort: params.sort,
    search: params.search,
    status: params.status,
    priority: params.priority,
    assignedTo: params.assignedTo ?? '',
    dateFrom: params.dateFrom ?? '',
    dateTo: params.dateTo ?? '',
    valueMin: params.valueMin ?? '',
    valueMax: params.valueMax ?? '',
    pipelineId: params.pipelineId ?? '',
  })

  const getCached = unstable_cache(
    async () => fetchDealsPaginatedFromDb(ctx.orgId, ctx.userId, elevated, params),
    [`deals-paginated-${ctx.orgId}-${ctx.userId}-${elevated}-${paramsKey}`],
    {
      tags: [`deals:${ctx.orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

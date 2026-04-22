import 'server-only'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { DealStatus, DealPriority } from '@prisma/client'
import type { DealListDto } from './get-deals'
import { buildDealWhereClause } from './build-deal-where-clause'

// Limite de segurança para evitar exportações que estourem memória ou timeout
const EXPORT_MAX_ROWS = 10_000

export interface ExportDealFilters {
  search?: string
  status?: DealStatus[]
  priority?: DealPriority[]
  assignedTo?: string
  dateFrom?: string
  dateTo?: string
  valueMin?: number
  valueMax?: number
  pipelineId?: string
}

/**
 * Busca deals para exportação CSV sem cache e sem paginação.
 * Reutiliza buildDealWhereClause para aplicar os mesmos filtros
 * que serão usados pela view paginada (Frente B).
 *
 * Não usa unstable_cache pois é chamada sob demanda pela action de exportação
 * e os dados devem refletir o estado atual sem delay de cache.
 */
export async function getDealsForExport(
  ctx: RBACContext,
  filters: ExportDealFilters,
): Promise<DealListDto[]> {
  const elevated = isElevated(ctx.userRole)

  const where = buildDealWhereClause({
    orgId: ctx.orgId,
    userId: ctx.userId,
    elevated,
    ...filters,
  })

  const deals = await db.deal.findMany({
    where,
    take: EXPORT_MAX_ROWS,
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
    orderBy: { createdAt: 'desc' },
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

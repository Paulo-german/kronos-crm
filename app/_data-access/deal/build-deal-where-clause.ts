import 'server-only'
import type { Prisma, DealStatus, DealPriority } from '@prisma/client'
import { SIMULATOR_CONTACT_PHONE } from '@/_lib/simulator'

interface DealFilterParams {
  orgId: string
  userId: string
  elevated: boolean
  search?: string
  status?: DealStatus[]
  priority?: DealPriority[]
  assignedTo?: string
  dateFrom?: string
  dateTo?: string
  valueMin?: number
  valueMax?: number
}

/**
 * Extrai a lógica de filtragem da query de deals para ser reutilizada
 * entre getDealsPaginated (Frente B) e getDealsForExport (Frente A).
 *
 * Filtro de valor (valueMin/valueMax) opera sobre deal.value (campo base no banco),
 * não sobre totalValue computado a partir dos produtos — necessário para queries
 * server-side com paginação eficiente.
 *
 * RBAC:
 * - elevated (ADMIN/OWNER): vê todos os deals da org, mas respeita assignedTo manual
 * - não-elevated (MEMBER): forçado a ver apenas deals atribuídos ao próprio userId
 */
export function buildDealWhereClause(params: DealFilterParams): Prisma.DealWhereInput {
  const {
    orgId,
    userId,
    elevated,
    search,
    status,
    priority,
    assignedTo,
    dateFrom,
    dateTo,
    valueMin,
    valueMax,
  } = params

  const rbacFilter: Prisma.DealWhereInput = elevated
    ? assignedTo ? { assignedTo } : {}
    : { assignedTo: userId }

  const searchFilter: Prisma.DealWhereInput =
    search && search.trim().length > 0
      ? {
          OR: [
            { title: { contains: search.trim(), mode: 'insensitive' } },
            {
              contacts: {
                some: {
                  contact: {
                    name: { contains: search.trim(), mode: 'insensitive' },
                  },
                },
              },
            },
          ],
        }
      : {}

  const statusFilter: Prisma.DealWhereInput =
    status && status.length > 0 ? { status: { in: status } } : {}

  const priorityFilter: Prisma.DealWhereInput =
    priority && priority.length > 0 ? { priority: { in: priority } } : {}

  const dateFilter: Prisma.DealWhereInput =
    dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}

  const valueFilter: Prisma.DealWhereInput =
    valueMin !== undefined || valueMax !== undefined
      ? {
          value: {
            ...(valueMin !== undefined ? { gte: valueMin } : {}),
            ...(valueMax !== undefined ? { lte: valueMax } : {}),
          },
        }
      : {}

  return {
    organizationId: orgId,
    // Exclui deals simulados da listagem paginada e exports
    contacts: { none: { contact: { phone: SIMULATOR_CONTACT_PHONE } } },
    ...rbacFilter,
    ...searchFilter,
    ...statusFilter,
    ...priorityFilter,
    ...dateFilter,
    ...valueFilter,
  }
}

import 'server-only'
import { db } from '@/_lib/prisma'
import type { Prisma, LifecycleStage, CustomerStatus } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { maskEmail, maskPhone } from '@/_lib/pii-mask'
import { buildContactFilterWhere } from './build-contact-filter-where'

// Limite de segurança para evitar exportações que estourem memória ou timeout
const EXPORT_MAX_ROWS = 10_000

export interface ExportContactFilters {
  search?: string
  assignedTo?: string
  companyId?: string
  isDecisionMaker?: boolean
  hasDeals?: boolean
  lifecycleStages?: LifecycleStage[]
  customerStatuses?: CustomerStatus[]
  healthScoreMin?: number
  healthScoreMax?: number
}

export interface ExportContactRow {
  name: string
  email: string | null
  phone: string | null
  role: string | null
  isDecisionMaker: boolean
  companyName: string | null
  lifecycleStage: LifecycleStage
  customerStatus: CustomerStatus
  healthScore: number | null
  assigneeName: string | null
  createdAt: Date
}

/**
 * Busca contatos para exportação CSV sem cache e sem paginação.
 * Reutiliza buildContactFilterWhere para aplicar os mesmos filtros da view
 * paginada e respeita o RBAC (MEMBER só os próprios) e o mascaramento de PII.
 *
 * Não usa unstable_cache: é chamada sob demanda pela action de exportação e
 * deve refletir o estado atual sem delay de cache.
 */
export async function getContactsForExport(
  ctx: RBACContext,
  filters: ExportContactFilters,
): Promise<ExportContactRow[]> {
  const elevated = isElevated(ctx.userRole)
  const masked = !elevated && (ctx.hidePiiFromMembers ?? false)
  const search = filters.search?.trim()

  const where: Prisma.ContactWhereInput = {
    organizationId: ctx.orgId,
    // RBAC: MEMBER sempre filtrado pelos próprios registros
    ...(elevated ? {} : { assignedTo: ctx.userId }),
    // Filtro manual de responsável (só aplicado quando elevated)
    ...(elevated && filters.assignedTo
      ? { assignedTo: filters.assignedTo }
      : {}),
    // Filtros nativos compartilhados com listagem e segmentos
    ...buildContactFilterWhere(filters),
    // Busca textual: nome, email ou telefone (case-insensitive).
    // Quando masked, email/phone são removidos da busca para não vazar PII.
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            ...(!masked
              ? [
                  {
                    email: { contains: search, mode: 'insensitive' as const },
                  },
                  {
                    phone: { contains: search, mode: 'insensitive' as const },
                  },
                ]
              : []),
          ],
        }
      : {}),
  }

  const contacts = await db.contact.findMany({
    where,
    take: EXPORT_MAX_ROWS,
    include: {
      company: { select: { name: true } },
      assignee: { select: { fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return contacts.map((contact) => ({
    name: contact.name,
    email: masked ? maskEmail(contact.email) : contact.email,
    phone: masked ? maskPhone(contact.phone) : contact.phone,
    role: contact.role,
    isDecisionMaker: contact.isDecisionMaker,
    companyName: contact.company?.name ?? null,
    lifecycleStage: contact.lifecycleStage,
    customerStatus: contact.customerStatus,
    healthScore: contact.healthScore,
    assigneeName: contact.assignee?.fullName ?? contact.assignee?.email ?? null,
    createdAt: contact.createdAt,
  }))
}

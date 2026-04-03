import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { maskEmail, maskPhone, maskCpf } from '@/_lib/pii-mask'

export interface ContactDto {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  cpf: string | null
  isDecisionMaker: boolean
  companyId: string | null
  companyName: string | null
  assignedTo: string | null
  deals: { id: string; title: string }[]
  createdAt: Date
  updatedAt: Date
}

export interface ContactListParams {
  page: number
  pageSize: number
  sort: 'recent' | 'oldest' | 'nameAsc' | 'nameDesc'
  search: string
  companyId?: string
  isDecisionMaker?: boolean
  hasDeals?: boolean
  /** Filtro manual de responsável — só é aplicado para ADMIN/OWNER (elevado). MEMBER ignora este campo. */
  assignedTo?: string
}

export interface ContactListResult {
  data: ContactDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Mapeamento das opções de ordenação para colunas do banco
const CONTACT_SORT_MAP: Record<
  ContactListParams['sort'],
  { field: string; direction: 'asc' | 'desc' }
> = {
  recent: { field: 'createdAt', direction: 'desc' },
  oldest: { field: 'createdAt', direction: 'asc' },
  nameAsc: { field: 'name', direction: 'asc' },
  nameDesc: { field: 'name', direction: 'desc' },
}

// ─────────────────────────────────────────────────────────────
// Função base (sem cache) — busca todos os contatos sem paginação
// Usada pelos módulos de Deals (pipeline, list, contact-widget)
// ─────────────────────────────────────────────────────────────
const fetchContactsFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
  hidePiiFromMembers: boolean,
): Promise<ContactDto[]> => {
  const contacts = await db.contact.findMany({
    where: {
      organizationId: orgId,
      ...(elevated ? {} : { assignedTo: userId }),
    },
    include: {
      company: {
        select: {
          name: true,
        },
      },
      deals: {
        include: {
          deal: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const masked = !elevated && hidePiiFromMembers

  return contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    email: masked ? maskEmail(contact.email) : contact.email,
    phone: masked ? maskPhone(contact.phone) : contact.phone,
    role: contact.role,
    cpf: masked ? maskCpf(contact.cpf) : contact.cpf,
    isDecisionMaker: contact.isDecisionMaker,
    companyId: contact.companyId,
    companyName: contact.company?.name ?? null,
    assignedTo: contact.assignedTo,
    deals: contact.deals.map((dc) => dc.deal),
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  }))
}

/**
 * Busca todos os contatos da organização (Cacheado)
 * RBAC: MEMBER só vê contatos atribuídos a ele
 *
 * Mantida para compatibilidade com os módulos de Deals que precisam
 * da lista completa para o combobox de vinculação de contatos.
 */
export const getContacts = async (ctx: RBACContext): Promise<ContactDto[]> => {
  const elevated = isElevated(ctx.userRole)
  const hidePiiFromMembers = ctx.hidePiiFromMembers ?? false

  const getCached = unstable_cache(
    async () => fetchContactsFromDb(ctx.orgId, ctx.userId, elevated, hidePiiFromMembers),
    [`contacts-${ctx.orgId}-${ctx.userId}-${elevated}-${hidePiiFromMembers}`],
    {
      tags: [`contacts:${ctx.orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

// ─────────────────────────────────────────────────────────────
// Função base paginada (sem cache) — usada por getContactsPaginated
// ─────────────────────────────────────────────────────────────
const fetchContactsPaginatedFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
  hidePiiFromMembers: boolean,
  params: ContactListParams,
): Promise<ContactListResult> => {
  const sortConfig = CONTACT_SORT_MAP[params.sort]
  const masked = !elevated && hidePiiFromMembers

  // Constrói cláusula WHERE com todos os filtros
  const where: Prisma.ContactWhereInput = {
    organizationId: orgId,
    // RBAC: MEMBER sempre filtrado pelos próprios registros
    ...(elevated ? {} : { assignedTo: userId }),
    // Filtro manual de responsável (só aplicado quando elevated)
    ...(elevated && params.assignedTo ? { assignedTo: params.assignedTo } : {}),
    // Filtro por empresa
    ...(params.companyId ? { companyId: params.companyId } : {}),
    // Filtro de decisor
    ...(params.isDecisionMaker !== undefined
      ? { isDecisionMaker: params.isDecisionMaker }
      : {}),
    // Filtro por presença de negócios vinculados
    ...(params.hasDeals !== undefined
      ? params.hasDeals
        ? { deals: { some: {} } }
        : { deals: { none: {} } }
      : {}),
    // Busca textual: nome, email ou telefone (case-insensitive)
    // Quando masked: email e phone removidos para não vazar PII por busca
    ...(params.search.trim()
      ? {
          OR: [
            {
              name: {
                contains: params.search.trim(),
                mode: 'insensitive' as const,
              },
            },
            ...(!masked
              ? [
                  {
                    email: {
                      contains: params.search.trim(),
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    phone: {
                      contains: params.search.trim(),
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
          ],
        }
      : {}),
  }

  // Constrói cláusula ORDER BY baseada no sort param
  const orderBy: Prisma.ContactOrderByWithRelationInput = {
    [sortConfig.field]: sortConfig.direction,
  }

  // Executa count e findMany em paralelo para eficiência
  const [total, contacts] = await Promise.all([
    db.contact.count({ where }),
    db.contact.findMany({
      where,
      include: {
        company: { select: { name: true } },
        deals: {
          include: {
            deal: {
              select: { id: true, title: true },
            },
          },
        },
      },
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ])

  return {
    data: contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      email: masked ? maskEmail(contact.email) : contact.email,
      phone: masked ? maskPhone(contact.phone) : contact.phone,
      role: contact.role,
      cpf: masked ? maskCpf(contact.cpf) : contact.cpf,
      isDecisionMaker: contact.isDecisionMaker,
      companyId: contact.companyId,
      companyName: contact.company?.name ?? null,
      assignedTo: contact.assignedTo,
      deals: contact.deals.map((dc) => dc.deal),
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  }
}

/**
 * Busca contatos com paginação, filtros e ordenação server-side (Cacheado)
 * RBAC: MEMBER só vê contatos atribuídos a ele
 *
 * Cache key inclui todos os parâmetros para garantir entradas distintas por combinação de filtros.
 * Tag compartilhada contacts:${orgId} garante invalidação correta em qualquer mutação.
 */
export const getContactsPaginated = async (
  ctx: RBACContext,
  params: ContactListParams,
): Promise<ContactListResult> => {
  const elevated = isElevated(ctx.userRole)
  const hidePiiFromMembers = ctx.hidePiiFromMembers ?? false

  // Serializa params para cache key determinística
  const paramsKey = JSON.stringify({
    page: params.page,
    pageSize: params.pageSize,
    sort: params.sort,
    search: params.search,
    companyId: params.companyId ?? '',
    isDecisionMaker: params.isDecisionMaker ?? '',
    hasDeals: params.hasDeals ?? '',
    assignedTo: params.assignedTo ?? '',
  })

  const getCached = unstable_cache(
    async () =>
      fetchContactsPaginatedFromDb(ctx.orgId, ctx.userId, elevated, hidePiiFromMembers, params),
    [`contacts-${ctx.orgId}-${ctx.userId}-${elevated}-${hidePiiFromMembers}-${paramsKey}`],
    {
      tags: [`contacts:${ctx.orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

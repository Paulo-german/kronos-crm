import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { ServiceDto } from './get-services'

export interface ServiceListParams {
  page: number
  pageSize: number
  search: string
  categoryId?: string
  status: 'all' | 'active' | 'inactive'
}

export interface ServiceListResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─────────────────────────────────────────────────────────────
// Função base (sem cache) — busca serviços com paginação e filtros
// ─────────────────────────────────────────────────────────────
const fetchServicesPaginatedFromDb = async (
  orgId: string,
  params: ServiceListParams,
): Promise<ServiceListResult<ServiceDto>> => {
  const { page, pageSize, search, categoryId, status } = params

  const where = {
    organizationId: orgId,
    ...(search.trim() ? { name: { contains: search.trim(), mode: 'insensitive' as const } } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(status === 'active' ? { isActive: true } : {}),
    ...(status === 'inactive' ? { isActive: false } : {}),
  }

  const [services, total] = await Promise.all([
    db.service.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true },
        },
        professionalServices: {
          include: {
            professional: {
              select: { id: true, name: true, avatarUrl: true, isActive: true },
            },
          },
        },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.service.count({ where }),
  ])

  const data: ServiceDto[] = services.map((service) => ({
    id: service.id,
    organizationId: service.organizationId,
    categoryId: service.categoryId,
    categoryName: service.category?.name ?? null,
    name: service.name,
    duration: service.duration,
    price: service.price.toString(),
    isActive: service.isActive,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
    professionalServices: service.professionalServices.map((ps) => ({
      id: ps.id,
      professionalId: ps.professionalId,
      professional: ps.professional,
    })),
  }))

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * Lista serviços com paginação e filtros server-side (Cacheado)
 * Substitui getServices() na página de listagem de serviços
 */
export const getServicesPaginated = async (
  orgId: string,
  params: ServiceListParams,
): Promise<ServiceListResult<ServiceDto>> => {
  const getCached = unstable_cache(
    async () => fetchServicesPaginatedFromDb(orgId, params),
    [`services-paginated-${orgId}-${JSON.stringify(params)}`],
    {
      tags: [`services:${orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

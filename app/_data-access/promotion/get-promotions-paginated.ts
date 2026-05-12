import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { PromotionDto } from './get-promotions'

export interface PromotionListParams {
  page: number
  pageSize: number
  search: string
  status: 'all' | 'active' | 'inactive'
}

export interface PromotionListResult {
  data: PromotionDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const fetchPromotionsPaginatedFromDb = async (
  orgId: string,
  params: PromotionListParams,
): Promise<PromotionListResult> => {
  const { page, pageSize, search, status } = params

  const where = {
    organizationId: orgId,
    ...(search.trim() ? { name: { contains: search.trim(), mode: 'insensitive' as const } } : {}),
    ...(status === 'active' ? { isActive: true } : {}),
    ...(status === 'inactive' ? { isActive: false } : {}),
  }

  const [promotions, total] = await Promise.all([
    db.promotion.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        discountType: true,
        discountValue: true,
        isActive: true,
        createdAt: true,
        _count: { select: { items: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            productId: true,
            serviceId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.promotion.count({ where }),
  ])

  return {
    data: promotions.map((promotion) => ({
      id: promotion.id,
      name: promotion.name,
      description: promotion.description,
      price: Number(promotion.price),
      discountType: promotion.discountType,
      discountValue: Number(promotion.discountValue),
      isActive: promotion.isActive,
      itemCount: promotion._count.items,
      items: promotion.items,
      createdAt: promotion.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export const getPromotionsPaginated = async (
  orgId: string,
  params: PromotionListParams,
): Promise<PromotionListResult> => {
  const getCached = unstable_cache(
    async () => fetchPromotionsPaginatedFromDb(orgId, params),
    [`promotions-paginated-${orgId}-${JSON.stringify(params)}`],
    {
      tags: [`promotions:${orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface PromotionItemDto {
  id: string
  quantity: number
  productId: string | null
  serviceId: string | null
}

export interface PromotionDto {
  id: string
  name: string
  description: string | null
  price: number
  discountType: string
  discountValue: number
  isActive: boolean
  itemCount: number
  items: PromotionItemDto[]
  createdAt: Date
}

const fetchPromotionsFromDb = async (orgId: string): Promise<PromotionDto[]> => {
  const promotions = await db.promotion.findMany({
    where: {
      organizationId: orgId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      discountType: true,
      discountValue: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: { items: true },
      },
      items: {
        select: {
          id: true,
          quantity: true,
          productId: true,
          serviceId: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return promotions.map((promotion) => ({
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
  }))
}

/**
 * Lista todas as promoções da organização (Cacheado)
 * Promoções são globais da org — sem RBAC de ownership.
 * Usa Request Memoization (React) + Data Cache (Next.js).
 */
export const getPromotions = cache(async (orgId: string): Promise<PromotionDto[]> => {
  const getCached = unstable_cache(
    async () => fetchPromotionsFromDb(orgId),
    [`promotions-${orgId}`],
    {
      tags: [`promotions:${orgId}`],
    },
  )

  return getCached()
})

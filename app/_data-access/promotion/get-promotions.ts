import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface PromotionDto {
  id: string
  name: string
  description: string | null
  price: number
  isActive: boolean
  itemCount: number
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
      isActive: true,
      createdAt: true,
      _count: {
        select: { items: true },
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
    isActive: promotion.isActive,
    itemCount: promotion._count.items,
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

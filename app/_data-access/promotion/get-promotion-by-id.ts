import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface PromotionItemDto {
  id: string
  quantity: number
  product: { id: string; name: string } | null
  service: { id: string; name: string } | null
}

export interface PromotionDetailDto {
  id: string
  organizationId: string
  name: string
  description: string | null
  price: number
  isActive: boolean
  items: PromotionItemDto[]
  createdAt: Date
  updatedAt: Date
}

const fetchPromotionByIdFromDb = async (
  id: string,
  orgId: string,
): Promise<PromotionDetailDto | null> => {
  const promotion = await db.promotion.findFirst({
    where: { id, organizationId: orgId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true } },
          service: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!promotion) return null

  return {
    id: promotion.id,
    organizationId: promotion.organizationId,
    name: promotion.name,
    description: promotion.description,
    price: Number(promotion.price),
    isActive: promotion.isActive,
    items: promotion.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: item.product,
      service: item.service,
    })),
    createdAt: promotion.createdAt,
    updatedAt: promotion.updatedAt,
  }
}

/**
 * Busca uma promoção por ID com items expandidos (produto/serviço) (Cacheado)
 * Promoções são globais da org — sem RBAC de ownership.
 * Invalida via `promotions:${orgId}` (lista + qualquer mutação) ou `promotion:${id}` (granular).
 */
export const getPromotionById = async (
  id: string,
  orgId: string,
): Promise<PromotionDetailDto | null> => {
  const getCached = unstable_cache(
    async () => fetchPromotionByIdFromDb(id, orgId),
    [`promotion-${id}-${orgId}`],
    {
      tags: [`promotions:${orgId}`, `promotion:${id}`],
    },
  )

  return getCached()
}

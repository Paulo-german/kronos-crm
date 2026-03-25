import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface ProductDto {
  id: string
  name: string
  description: string | null
  price: number
  isActive: boolean
  mediaCount: number
  createdAt: Date
  updatedAt: Date
}

const fetchProductsFromDb = async (orgId: string): Promise<ProductDto[]> => {
  const products = await db.product.findMany({
    where: {
      organizationId: orgId,
    },
    include: {
      _count: {
        select: { media: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    isActive: product.isActive,
    mediaCount: product._count.media,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }))
}

/**
 * Busca todos os produtos da organização (Cacheado)
 * Usa Request Memoization (React) + Data Cache (Next.js)
 * Multi-tenancy via organizationId
 */
export const getProducts = cache(async (orgId: string): Promise<ProductDto[]> => {
  const getCached = unstable_cache(
    async () => fetchProductsFromDb(orgId),
    [`products-${orgId}`],
    {
      tags: [`products:${orgId}`],
    },
  )

  return getCached()
})

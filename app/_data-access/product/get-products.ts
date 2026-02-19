import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface ProductDto {
  id: string
  name: string
  description: string | null
  price: number
  createdAt: Date
  updatedAt: Date
}

const fetchProductsFromDb = async (orgId: string): Promise<ProductDto[]> => {
  const products = await db.product.findMany({
    where: {
      organizationId: orgId,
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
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }))
}

/**
 * Busca todos os produtos da organização (Cacheado)
 * Multi-tenancy via organizationId
 */
export const getProducts = async (orgId: string): Promise<ProductDto[]> => {
  const getCached = unstable_cache(
    async () => fetchProductsFromDb(orgId),
    [`products-${orgId}`],
    {
      tags: [`products:${orgId}`],
    },
  )

  return getCached()
}

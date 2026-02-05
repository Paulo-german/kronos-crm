import 'server-only'
import { db } from '@/_lib/prisma'

export interface ProductDto {
  id: string
  name: string
  description: string | null
  price: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Busca todos os produtos da organização
 * Multi-tenancy via organizationId
 */
export const getProducts = async (orgId: string): Promise<ProductDto[]> => {
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

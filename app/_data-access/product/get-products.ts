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
 * Busca todos os produtos do usuário
 * Multi-tenancy via ownerId
 */
export const getProducts = async (userId: string): Promise<ProductDto[]> => {
  const products = await db.product.findMany({
    where: {
      ownerId: userId,
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

import 'server-only'
import { db } from '@/_lib/prisma'

export interface ProductDetailDto {
  id: string
  name: string
  description: string | null
  price: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Busca um produto específico por ID
 * Multi-tenancy via ownerId
 */
export const getProductById = async (
  productId: string,
  userId: string,
): Promise<ProductDetailDto | null> => {
  const product = await db.product.findFirst({
    where: {
      id: productId,
      ownerId: userId,
    },
  })

  if (!product) return null

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface ProductMediaDto {
  id: string
  type: 'IMAGE' | 'VIDEO'
  url: string
  fileName: string
  mimeType: string
  fileSize: number
  order: number
}

const fetchProductMediaFromDb = async (
  productId: string,
  orgId: string,
): Promise<ProductMediaDto[]> => {
  const mediaItems = await db.productMedia.findMany({
    where: {
      productId,
      organizationId: orgId,
    },
    orderBy: {
      order: 'asc',
    },
  })

  return mediaItems.map((item) => ({
    id: item.id,
    type: item.type,
    url: item.url,
    fileName: item.fileName,
    mimeType: item.mimeType,
    fileSize: item.fileSize,
    order: item.order,
  }))
}

/**
 * Busca todas as mídias de um produto específico (Cacheado)
 * Usa Request Memoization (React) + Data Cache (Next.js)
 * Ordenado por `order ASC` para respeitar a ordenação definida pelo usuário
 */
export const getProductMedia = cache(
  async (productId: string, orgId: string): Promise<ProductMediaDto[]> => {
    const getCached = unstable_cache(
      async () => fetchProductMediaFromDb(productId, orgId),
      [`product-media-${productId}`],
      {
        tags: [`product-media:${productId}`, `products:${orgId}`],
      },
    )

    return getCached()
  },
)

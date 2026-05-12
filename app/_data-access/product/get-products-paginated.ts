import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { ProductDto } from './get-products'

export interface ProductListParams {
  page: number
  pageSize: number
  search: string
  status: 'all' | 'active' | 'inactive'
}

export interface ProductListResult {
  data: ProductDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const fetchProductsPaginatedFromDb = async (
  orgId: string,
  params: ProductListParams,
): Promise<ProductListResult> => {
  const { page, pageSize, search, status } = params

  const where = {
    organizationId: orgId,
    ...(search.trim() ? { name: { contains: search.trim(), mode: 'insensitive' as const } } : {}),
    ...(status === 'active' ? { isActive: true } : {}),
    ...(status === 'inactive' ? { isActive: false } : {}),
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        _count: { select: { media: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count({ where }),
  ])

  return {
    data: products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      isActive: product.isActive,
      mediaCount: product._count.media,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export const getProductsPaginated = async (
  orgId: string,
  params: ProductListParams,
): Promise<ProductListResult> => {
  const getCached = unstable_cache(
    async () => fetchProductsPaginatedFromDb(orgId, params),
    [`products-paginated-${orgId}-${JSON.stringify(params)}`],
    {
      tags: [`products:${orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

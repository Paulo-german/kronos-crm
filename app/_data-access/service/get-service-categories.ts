import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface ServiceCategoryDto {
  id: string
  organizationId: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count: { services: number }
}

const fetchServiceCategoriesFromDb = async (orgId: string): Promise<ServiceCategoryDto[]> => {
  const categories = await db.serviceCategory.findMany({
    where: { organizationId: orgId },
    include: {
      _count: {
        select: { services: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return categories.map((category) => ({
    id: category.id,
    organizationId: category.organizationId,
    name: category.name,
    isActive: category.isActive,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    _count: category._count,
  }))
}

/**
 * Lista todas as categorias de serviço da organização (Cacheado)
 */
export const getServiceCategories = async (orgId: string): Promise<ServiceCategoryDto[]> => {
  const getCached = unstable_cache(
    async () => fetchServiceCategoriesFromDb(orgId),
    [`service-categories-${orgId}`],
    {
      tags: [`service-categories:${orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

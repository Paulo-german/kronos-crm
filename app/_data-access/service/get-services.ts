import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface ServiceDto {
  id: string
  organizationId: string
  categoryId: string
  categoryName: string
  name: string
  duration: number
  price: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const fetchServicesFromDb = async (
  orgId: string,
  includeInactive: boolean,
): Promise<ServiceDto[]> => {
  const services = await db.service.findMany({
    where: {
      organizationId: orgId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: {
      category: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
  })

  return services.map((service) => ({
    id: service.id,
    organizationId: service.organizationId,
    categoryId: service.categoryId,
    categoryName: service.category.name,
    name: service.name,
    duration: service.duration,
    price: service.price.toString(),
    isActive: service.isActive,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  }))
}

/**
 * Lista serviços da organização com categoria embutida (Cacheado)
 * Por padrão filtra apenas serviços ativos — passar includeInactive=true para incluir inativos
 */
export const getServices = async (
  orgId: string,
  includeInactive = false,
): Promise<ServiceDto[]> => {
  const getCached = unstable_cache(
    async () => fetchServicesFromDb(orgId, includeInactive),
    [`services-${orgId}-${includeInactive}`],
    {
      tags: [`services:${orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

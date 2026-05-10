import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface ServiceDetailDto {
  id: string
  organizationId: string
  categoryId: string
  category: { id: string; name: string; isActive: boolean }
  name: string
  duration: number
  price: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  professionalServices: Array<{
    id: string
    professionalId: string
    professional: {
      id: string
      name: string
      avatarUrl: string | null
      isActive: boolean
    }
  }>
}

const fetchServiceByIdFromDb = async (
  id: string,
  orgId: string,
): Promise<ServiceDetailDto | null> => {
  const service = await db.service.findFirst({
    where: { id, organizationId: orgId },
    include: {
      category: {
        select: { id: true, name: true, isActive: true },
      },
      professionalServices: {
        include: {
          professional: {
            select: { id: true, name: true, avatarUrl: true, isActive: true },
          },
        },
      },
    },
  })

  if (!service) return null

  return {
    id: service.id,
    organizationId: service.organizationId,
    categoryId: service.categoryId,
    category: service.category,
    name: service.name,
    duration: service.duration,
    price: service.price.toString(),
    isActive: service.isActive,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
    professionalServices: service.professionalServices.map((ps) => ({
      id: ps.id,
      professionalId: ps.professionalId,
      professional: ps.professional,
    })),
  }
}

/**
 * Busca serviço por ID com profissionais vinculados (Cacheado)
 */
export const getServiceById = async (
  id: string,
  orgId: string,
): Promise<ServiceDetailDto | null> => {
  const getCached = unstable_cache(
    async () => fetchServiceByIdFromDb(id, orgId),
    [`service-${id}-${orgId}`],
    {
      tags: [`service:${id}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

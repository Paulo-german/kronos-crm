import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface ProfessionalDetailDto {
  id: string
  organizationId: string
  userId: string | null
  name: string
  phone: string | null
  bio: string | null
  avatarUrl: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  workingHours: Array<{
    id: string
    dayOfWeek: number
    startTime: string
    endTime: string
  }>
  workingHoursExceptions: Array<{
    id: string
    date: Date
    type: 'OFF' | 'CUSTOM_HOURS'
    startTime: string | null
    endTime: string | null
  }>
  professionalServices: Array<{
    id: string
    serviceId: string
    service: {
      id: string
      name: string
      duration: number
      price: string
      isActive: boolean
      categoryId: string
      category: { id: string; name: string }
    }
  }>
  manualOrders: Array<{
    id: string
    order: number
  }>
}

const fetchProfessionalByIdFromDb = async (
  id: string,
  orgId: string,
): Promise<ProfessionalDetailDto | null> => {
  const professional = await db.professional.findFirst({
    where: { id, organizationId: orgId },
    include: {
      workingHours: {
        orderBy: { dayOfWeek: 'asc' },
      },
      workingHoursExceptions: {
        orderBy: { date: 'asc' },
      },
      professionalServices: {
        include: {
          service: {
            include: {
              category: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
      manualOrders: true,
    },
  })

  if (!professional) return null

  return {
    id: professional.id,
    organizationId: professional.organizationId,
    userId: professional.userId,
    name: professional.name,
    phone: professional.phone,
    bio: professional.bio,
    avatarUrl: professional.avatarUrl,
    isActive: professional.isActive,
    createdAt: professional.createdAt,
    updatedAt: professional.updatedAt,
    workingHours: professional.workingHours.map((wh) => ({
      id: wh.id,
      dayOfWeek: wh.dayOfWeek,
      startTime: wh.startTime,
      endTime: wh.endTime,
    })),
    workingHoursExceptions: professional.workingHoursExceptions.map((exc) => ({
      id: exc.id,
      date: exc.date,
      type: exc.type,
      startTime: exc.startTime,
      endTime: exc.endTime,
    })),
    professionalServices: professional.professionalServices.map((ps) => ({
      id: ps.id,
      serviceId: ps.serviceId,
      service: {
        id: ps.service.id,
        name: ps.service.name,
        duration: ps.service.duration,
        price: ps.service.price.toString(),
        isActive: ps.service.isActive,
        categoryId: ps.service.categoryId,
        category: ps.service.category,
      },
    })),
    manualOrders: professional.manualOrders.map((mo) => ({
      id: mo.id,
      order: mo.order,
    })),
  }
}

/**
 * Busca profissional por ID com dados completos (Cacheado)
 * Inclui jornada de trabalho, exceções, serviços e ordem manual
 */
export const getProfessionalById = async (
  id: string,
  orgId: string,
): Promise<ProfessionalDetailDto | null> => {
  const getCached = unstable_cache(
    async () => fetchProfessionalByIdFromDb(id, orgId),
    [`professional-${id}-${orgId}`],
    {
      tags: [`professional:${id}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

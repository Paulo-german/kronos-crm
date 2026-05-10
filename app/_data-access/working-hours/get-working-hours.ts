import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface WorkingHoursDto {
  id: string
  professionalId: string
  organizationId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  createdAt: Date
  updatedAt: Date
}

const fetchWorkingHoursFromDb = async (
  professionalId: string,
  orgId: string,
): Promise<WorkingHoursDto[]> => {
  const records = await db.workingHours.findMany({
    where: { professionalId, organizationId: orgId },
    orderBy: { dayOfWeek: 'asc' },
  })

  return records.map((record) => ({
    id: record.id,
    professionalId: record.professionalId,
    organizationId: record.organizationId,
    dayOfWeek: record.dayOfWeek,
    startTime: record.startTime,
    endTime: record.endTime,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }))
}

/**
 * Busca jornada de trabalho semanal de um profissional (Cacheado)
 */
export const getWorkingHours = async (
  professionalId: string,
  orgId: string,
): Promise<WorkingHoursDto[]> => {
  const getCached = unstable_cache(
    async () => fetchWorkingHoursFromDb(professionalId, orgId),
    [`working-hours-${professionalId}-${orgId}`],
    {
      tags: [`working-hours:${professionalId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

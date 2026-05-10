import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'

export interface WorkingHoursExceptionDto {
  id: string
  professionalId: string
  organizationId: string
  date: Date
  type: 'OFF' | 'CUSTOM_HOURS'
  startTime: string | null
  endTime: string | null
  createdAt: Date
  updatedAt: Date
}

export interface WorkingHoursExceptionsParams {
  startDate?: Date
  endDate?: Date
}

const fetchWorkingHoursExceptionsFromDb = async (
  professionalId: string,
  orgId: string,
  params: WorkingHoursExceptionsParams,
): Promise<WorkingHoursExceptionDto[]> => {
  const dateFilter: Prisma.WorkingHoursExceptionWhereInput = {}

  if (params.startDate ?? params.endDate) {
    dateFilter.date = {
      ...(params.startDate ? { gte: params.startDate } : {}),
      ...(params.endDate ? { lte: params.endDate } : {}),
    }
  }

  const records = await db.workingHoursException.findMany({
    where: {
      professionalId,
      organizationId: orgId,
      ...dateFilter,
    },
    orderBy: { date: 'asc' },
  })

  return records.map((record) => ({
    id: record.id,
    professionalId: record.professionalId,
    organizationId: record.organizationId,
    date: record.date,
    type: record.type,
    startTime: record.startTime,
    endTime: record.endTime,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }))
}

/**
 * Busca exceções de jornada de um profissional (Cacheado)
 * Aceita filtro opcional por intervalo de datas (startDate, endDate)
 */
export const getWorkingHoursExceptions = async (
  professionalId: string,
  orgId: string,
  params: WorkingHoursExceptionsParams = {},
): Promise<WorkingHoursExceptionDto[]> => {
  const cacheKey = [
    `working-hours-exceptions-${professionalId}-${orgId}`,
    params.startDate?.toISOString() ?? 'no-start',
    params.endDate?.toISOString() ?? 'no-end',
  ].join('-')

  const getCached = unstable_cache(
    async () => fetchWorkingHoursExceptionsFromDb(professionalId, orgId, params),
    [cacheKey],
    {
      tags: [`working-hours:${professionalId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

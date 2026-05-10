import 'server-only'
import { db } from '@/_lib/prisma'
import { generateSlotsForDay, formatDateUtc, type SlotDto } from './slot-utils'
import { getAppointmentsByDateRangeForProfessional } from '@/_data-access/appointment/get-appointments-by-date-range'

interface GetSlotsByDateParams {
  orgId: string
  date: Date
  serviceId: string
  professionalId?: string
}

interface ProfessionalCandidate {
  id: string
  name: string
}


/**
 * Retorna todos os slots livres de um dia específico para um serviço.
 * Sem limite de quantidade — retorna todos os slots disponíveis do dia.
 * Sem cache — disponibilidade muda em tempo real conforme agendamentos são criados.
 *
 * Se professionalId for fornecido, restringe a busca a este profissional.
 * Caso contrário, agrega slots de todos os profissionais elegíveis.
 */
export async function getSlotsByDate(
  params: GetSlotsByDateParams,
): Promise<SlotDto[]> {
  const { orgId, serviceId, date } = params

  // Busca duração do serviço
  const service = await db.service.findFirst({
    where: { id: serviceId, organizationId: orgId, isActive: true },
    select: { id: true, duration: true },
  })

  if (!service) return []

  // Resolve conjunto de profissionais elegíveis
  let professionals: ProfessionalCandidate[]

  if (params.professionalId) {
    const professional = await db.professional.findFirst({
      where: {
        id: params.professionalId,
        organizationId: orgId,
        isActive: true,
        professionalServices: { some: { serviceId } },
      },
      select: { id: true, name: true },
    })

    if (!professional) return []

    professionals = [professional]
  } else {
    professionals = await db.professional.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        professionalServices: { some: { serviceId } },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  }

  if (professionals.length === 0) return []

  const dateStr = formatDateUtc(date)
  const dayOfWeek = date.getUTCDay()

  // Busca slots de cada profissional em paralelo
  const allSlots = await Promise.all(
    professionals.map(async (professional) => {
      // Resolve jornada efetiva (exceção > jornada padrão)
      const exception = await db.workingHoursException.findFirst({
        where: { professionalId: professional.id, date },
        select: { type: true, startTime: true, endTime: true },
      })

      if (exception?.type === 'OFF') return []

      let workStart: string
      let workEnd: string

      if (exception?.type === 'CUSTOM_HOURS' && exception.startTime && exception.endTime) {
        workStart = exception.startTime
        workEnd = exception.endTime
      } else {
        const workingHours = await db.workingHours.findFirst({
          where: { professionalId: professional.id, dayOfWeek },
          select: { startTime: true, endTime: true },
        })

        if (!workingHours) return [] // Não trabalha neste dia da semana

        workStart = workingHours.startTime
        workEnd = workingHours.endTime
      }

      // Range do dia inteiro para busca de appointments conflitantes
      const dayStart = new Date(date)
      dayStart.setUTCHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setUTCHours(23, 59, 59, 999)

      const busySlots = await getAppointmentsByDateRangeForProfessional(
        orgId,
        professional.id,
        dayStart,
        dayEnd,
      )

      return generateSlotsForDay({
        professionalId: professional.id,
        professionalName: professional.name,
        serviceId,
        date: dateStr,
        workStart,
        workEnd,
        durationMinutes: service.duration,
        busySlots,
      })
    }),
  )

  // Achata e ordena por profissional + startTime
  return allSlots
    .flat()
    .sort((a, b) => {
      const nameCmp = a.professionalName.localeCompare(b.professionalName)
      if (nameCmp !== 0) return nameCmp
      return a.startTime.localeCompare(b.startTime)
    })
}

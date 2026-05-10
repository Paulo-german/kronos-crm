import 'server-only'
import { db } from '@/_lib/prisma'
import {
  MAX_LOOKAHEAD_DAYS,
  DEFAULT_SLOTS_LIMIT,
  generateSlotsForDay,
  timeToMinutes,
  formatDateUtc,
  type SlotDto,
} from './slot-utils'
import { getAppointmentsByDateRangeForProfessional } from '@/_data-access/appointment/get-appointments-by-date-range'

interface FindNextAvailableSlotsParams {
  orgId: string
  serviceId: string
  professionalId?: string // se fornecido, restringe a este profissional
  limit?: number // default DEFAULT_SLOTS_LIMIT
}

interface ProfessionalCandidate {
  id: string
  name: string
}

/**
 * Retorna hora e minuto de um Date em UTC como minutos desde meia-noite.
 */
function dateToUtcMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes()
}

/**
 * Avança uma Date para o início do dia seguinte (meia-noite UTC).
 */
function nextDayUtc(date: Date): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + 1)
  next.setUTCHours(0, 0, 0, 0)
  return next
}

/**
 * Retorna os próximos N slots disponíveis a partir de agora, iterando dia a dia.
 * Sem cache — disponibilidade muda em tempo real conforme agendamentos são criados.
 *
 * Se professionalId for fornecido, apenas ele é consultado. Caso contrário,
 * todos os profissionais ativos da org que executam o serviço são avaliados.
 */
export async function findNextAvailableSlots(
  params: FindNextAvailableSlotsParams,
): Promise<SlotDto[]> {
  const { orgId, serviceId, professionalId } = params
  const limit = params.limit ?? DEFAULT_SLOTS_LIMIT

  // Passo 1: busca duração do serviço
  const service = await db.service.findFirst({
    where: { id: serviceId, organizationId: orgId, isActive: true },
    select: { id: true, duration: true },
  })

  if (!service) return []

  // Passo 2: resolve conjunto de profissionais elegíveis
  let professionals: ProfessionalCandidate[]

  if (professionalId) {
    const professional = await db.professional.findFirst({
      where: {
        id: professionalId,
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

  // Passo 3: itera dia a dia a partir de agora até encontrar slots suficientes
  const now = new Date()
  const currentUtcMinutes = dateToUtcMinutes(now)

  // Começa pelo dia atual; se todos os profissionais já encerraram no dia de hoje,
  // o loop simplesmente não encontrará slots e avançará para o dia seguinte
  let cursor = new Date(now)
  cursor.setUTCHours(0, 0, 0, 0)

  const results: SlotDto[] = []
  let daysChecked = 0

  while (results.length < limit && daysChecked < MAX_LOOKAHEAD_DAYS) {
    const dateStr = formatDateUtc(cursor)
    const dayOfWeek = cursor.getUTCDay()
    const isToday = daysChecked === 0

    // Busca slots de cada profissional no dia em paralelo
    const daySlots = await Promise.all(
      professionals.map(async (professional) => {
        // Resolve jornada efetiva (exceção > jornada padrão)
        const exception = await db.workingHoursException.findFirst({
          where: { professionalId: professional.id, date: cursor },
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

        // Início do dia para o range de busca de appointments
        const dayStart = new Date(cursor)
        const dayEnd = new Date(cursor)
        dayEnd.setUTCHours(23, 59, 59, 999)

        const busySlots = await getAppointmentsByDateRangeForProfessional(
          orgId,
          professional.id,
          dayStart,
          dayEnd,
        )

        const slots = generateSlotsForDay({
          professionalId: professional.id,
          professionalName: professional.name,
          serviceId,
          date: dateStr,
          workStart,
          workEnd,
          durationMinutes: service.duration,
          busySlots,
        })

        // Se for hoje, filtra slots que já passaram usando minutos UTC atuais
        if (isToday) {
          return slots.filter(
            (slot) => timeToMinutes(slot.startTime) > currentUtcMinutes,
          )
        }

        return slots
      }),
    )

    // Achata slots do dia de todos os profissionais e ordena por startTime
    const flatDaySlots = daySlots
      .flat()
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    results.push(...flatDaySlots)

    cursor = nextDayUtc(cursor)
    daysChecked++
  }

  return results
    .sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date)
      if (dateCmp !== 0) return dateCmp
      return a.startTime.localeCompare(b.startTime)
    })
    .slice(0, limit)
}

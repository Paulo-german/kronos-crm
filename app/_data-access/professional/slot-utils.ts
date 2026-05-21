/**
 * Utilitários puros de geração de slots de agendamento.
 * Sem imports de banco — lógica pura reutilizável por booking core e agente IA.
 */
import { toZonedTime } from 'date-fns-tz'

const SAO_PAULO_TZ = 'America/Sao_Paulo'

export const SLOT_GRANULARITY_MINUTES = 15
export const MAX_LOOKAHEAD_DAYS = 30
export const DEFAULT_SLOTS_LIMIT = 5

export interface SlotDto {
  professionalId: string
  professionalName: string
  serviceId: string
  date: string // "YYYY-MM-DD"
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
}

/**
 * Converte string "HH:mm" em minutos desde meia-noite.
 * Usado para toda aritmética de tempo — evita construção de Date com timezone drift.
 */
export function timeToMinutes(time: string): number {
  const [hourStr, minuteStr] = time.split(':')
  return parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10)
}

/**
 * Converte minutos desde meia-noite de volta para string "HH:mm".
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * Formata Date para string "YYYY-MM-DD" no UTC, alinhado com o campo @db.Date do Postgres.
 */
export function formatDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Gera todos os slots livres de um dia para um profissional dado seu serviço, jornada e ocupações.
 *
 * A aritmética de tempo é feita em minutos inteiros para evitar timezone drift.
 * Os busySlots (UTC do banco) são convertidos para o fuso SP antes da extração
 * de hora/minuto, garantindo alinhamento com workStart/workEnd que são strings locais.
 */
export function generateSlotsForDay(params: {
  professionalId: string
  professionalName: string
  serviceId: string
  date: string // "YYYY-MM-DD"
  workStart: string // "HH:mm"
  workEnd: string // "HH:mm"
  durationMinutes: number
  busySlots: Array<{ startDate: Date; endDate: Date }>
}): SlotDto[] {
  const {
    professionalId,
    professionalName,
    serviceId,
    date,
    workStart,
    workEnd,
    durationMinutes,
    busySlots,
  } = params

  const workStartMinutes = timeToMinutes(workStart)
  const workEndMinutes = timeToMinutes(workEnd)

  // Converte busySlots (UTC do banco) para minutos no fuso SP, alinhando com workStart/workEnd
  const busyIntervals = busySlots.map((slot) => {
    const startSP = toZonedTime(slot.startDate, SAO_PAULO_TZ)
    const endSP = toZonedTime(slot.endDate, SAO_PAULO_TZ)
    return {
      start: startSP.getHours() * 60 + startSP.getMinutes(),
      end: endSP.getHours() * 60 + endSP.getMinutes(),
    }
  })

  const slots: SlotDto[] = []
  let cursor = workStartMinutes

  while (cursor + durationMinutes <= workEndMinutes) {
    const slotStart = cursor
    const slotEnd = cursor + durationMinutes

    const hasConflict = busyIntervals.some(
      (busy) => slotStart < busy.end && slotEnd > busy.start,
    )

    if (!hasConflict) {
      slots.push({
        professionalId,
        professionalName,
        serviceId,
        date,
        startTime: minutesToTime(slotStart),
        endTime: minutesToTime(slotEnd),
      })
    }

    cursor += SLOT_GRANULARITY_MINUTES
  }

  return slots
}

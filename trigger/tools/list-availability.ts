import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import { getAppointmentsByDateRange } from '@/_data-access/appointment/get-appointments-by-date-range'
import type { ToolContext } from './types'

interface AvailabilitySlot {
  date: string       // "2026-03-15"
  dayOfWeek: string  // "sábado"
  startTime: string  // "09:00"
  endTime: string    // "09:30"
  startIso: string   // "2026-03-15T09:00:00-03:00"
}

interface ListAvailabilityResult {
  success: boolean
  message: string
  slots?: AvailabilitySlot[]
  totalSlots?: number
  slotAvailable?: boolean
}

export interface ListAvailabilityConfig {
  daysAhead: number      // 1-30
  slotDuration: number   // 15, 30, 45, 60, 90, 120
  startTime: string      // "07:00"
  endTime: string        // "23:00"
}

const MAX_SLOTS_TO_RETURN = 30
const TIMEZONE = 'America/Sao_Paulo'
const BRAZIL_OFFSET = '-03:00'

const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: 'domingo',
  1: 'segunda-feira',
  2: 'terça-feira',
  3: 'quarta-feira',
  4: 'quinta-feira',
  5: 'sexta-feira',
  6: 'sábado',
}

/**
 * Extrai a data local (YYYY-MM-DD) de uma Date no timezone de Brasília
 * sem depender de libs externas — mesmo padrão de check-business-hours.ts
 */
function toLocalDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value ?? ''
  const month = parts.find((part) => part.type === 'month')?.value ?? ''
  const day = parts.find((part) => part.type === 'day')?.value ?? ''

  return `${year}-${month}-${day}`
}

/**
 * Extrai o dia da semana local (0=domingo, 6=sábado) no timezone de Brasília
 */
function toLocalDayOfWeek(date: Date): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
  })
    .formatToParts(date)
    .find((part) => part.type === 'weekday')?.value

  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }
  return map[weekday ?? 'Sun'] ?? 0
}

/**
 * Constrói uma string ISO 8601 com offset fixo de Brasília (-03:00)
 * a partir de um Date que já representa o horário local correto
 */
function toIsoWithBrOffset(dateString: string, timeString: string): string {
  return `${dateString}T${timeString}:00${BRAZIL_OFFSET}`
}

/**
 * Converte "HH:MM" em minutos totais a partir da meia-noite
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Formata minutos totais de volta para "HH:MM"
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function createListAvailabilityTool(
  ctx: ToolContext,
  config: ListAvailabilityConfig,
) {
  return tool({
    description:
      'Consulta horários disponíveis na agenda. Use ANTES de sugerir horários ao cliente. ' +
      'Aceita parâmetros opcionais: date (YYYY-MM-DD) para consultar um dia específico, ' +
      'e time (HH:MM) junto com date para verificar se um slot exato está livre.',
    inputSchema: z.object({
      date: z
        .string()
        .optional()
        .describe(
          'Data específica no formato YYYY-MM-DD (ex: 2026-07-19). Se omitido, lista os próximos dias.',
        ),
      time: z
        .string()
        .optional()
        .describe(
          'Horário específico no formato HH:MM (ex: 10:00). Usar junto com date para checar um slot exato.',
        ),
    }),
    execute: async ({ date, time }): Promise<ListAvailabilityResult> => {
      try {
        if (!ctx.dealId) {
          return {
            success: false,
            message: 'Nenhum negócio vinculado a esta conversa.',
          }
        }

        const deal = await db.deal.findFirst({
          where: {
            id: ctx.dealId,
            organizationId: ctx.organizationId,
          },
          select: { assignedTo: true, stage: { select: { pipelineId: true } } },
        })

        if (!deal) {
          return { success: false, message: 'Negócio não encontrado.' }
        }

        if (!ctx.pipelineIds.includes(deal.stage.pipelineId)) {
          return { success: false, message: 'Sem permissão para este pipeline.' }
        }

        // Validar parâmetros opcionais do LLM
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return {
            success: false,
            message: 'Formato de data inválido. Use YYYY-MM-DD (ex: 2026-07-19).',
          }
        }

        if (time && !/^\d{2}:\d{2}$/.test(time)) {
          return {
            success: false,
            message: 'Formato de horário inválido. Use HH:MM (ex: 10:00).',
          }
        }

        if (time && !date) {
          return {
            success: false,
            message: 'Informe também a data (date) quando especificar um horário (time).',
          }
        }

        const now = new Date()
        const todayStr = toLocalDateString(now)

        if (date && date < todayStr) {
          return {
            success: false,
            message: 'Não é possível consultar datas no passado.',
          }
        }

        // Determinar janela de busca: data específica ou próximos N dias
        let rangeStart: Date
        let rangeEnd: Date
        let searchDays: number

        if (date) {
          rangeStart = new Date(`${date}T00:00:00${BRAZIL_OFFSET}`)
          rangeEnd = new Date(`${date}T23:59:59${BRAZIL_OFFSET}`)
          searchDays = 1
        } else {
          rangeStart = new Date(`${todayStr}T00:00:00${BRAZIL_OFFSET}`)
          const rangeEndDateStr = toLocalDateString(
            new Date(rangeStart.getTime() + config.daysAhead * 24 * 60 * 60 * 1000),
          )
          rangeEnd = new Date(`${rangeEndDateStr}T23:59:59${BRAZIL_OFFSET}`)
          searchDays = config.daysAhead
        }

        // Buscar todos os appointments ativos do responsável no range
        const existingAppointments = await getAppointmentsByDateRange(
          ctx.organizationId,
          deal.assignedTo,
          rangeStart,
          rangeEnd,
        )

        // Caso específico: date + time → verificar um slot exato
        if (date && time) {
          const requestedStart = timeToMinutes(time)
          const requestedEnd = requestedStart + config.slotDuration
          const cfgStartMinutes = timeToMinutes(config.startTime)
          const cfgEndMinutes = timeToMinutes(config.endTime)

          if (requestedStart < cfgStartMinutes || requestedEnd > cfgEndMinutes) {
            return {
              success: true,
              slotAvailable: false,
              message: `O horário ${time} está fora da janela de atendimento (${config.startTime}–${config.endTime}).`,
              slots: [],
              totalSlots: 0,
            }
          }

          const slotStartIso = toIsoWithBrOffset(date, time)
          const slotEndIso = toIsoWithBrOffset(date, minutesToTime(requestedEnd))
          const slotStartDate = new Date(slotStartIso)
          const slotEndDate = new Date(slotEndIso)

          if (slotStartDate <= now) {
            return {
              success: true,
              slotAvailable: false,
              message: `O horário ${time} do dia ${date} já passou.`,
              slots: [],
              totalSlots: 0,
            }
          }

          const hasConflict = existingAppointments.some(
            (appt) => slotStartDate < appt.endDate && slotEndDate > appt.startDate,
          )

          const dayOfWeekIndex = toLocalDayOfWeek(slotStartDate)
          const dayOfWeekLabel = DAY_OF_WEEK_LABELS[dayOfWeekIndex] ?? 'desconhecido'

          logger.info('Tool list_availability: specific slot check', {
            dealId: ctx.dealId,
            conversationId: ctx.conversationId,
            date,
            time,
            available: !hasConflict,
          })

          if (hasConflict) {
            return {
              success: true,
              slotAvailable: false,
              message: `O horário ${time} de ${dayOfWeekLabel} (${date}) NÃO está disponível — já existe um compromisso nesse período.`,
              slots: [],
              totalSlots: 0,
            }
          }

          return {
            success: true,
            slotAvailable: true,
            message: `O horário ${time} de ${dayOfWeekLabel} (${date}) está DISPONÍVEL.`,
            slots: [{
              date,
              dayOfWeek: dayOfWeekLabel,
              startTime: time,
              endTime: minutesToTime(requestedEnd),
              startIso: slotStartIso,
            }],
            totalSlots: 1,
          }
        }

        const slots: AvailabilitySlot[] = []

        const startMinutes = timeToMinutes(config.startTime)
        const endMinutes = timeToMinutes(config.endTime)

        // Iterar cada dia da janela
        for (let dayOffset = 0; dayOffset < searchDays; dayOffset++) {
          const dayDate = new Date(
            rangeStart.getTime() + dayOffset * 24 * 60 * 60 * 1000,
          )
          const dateStr = toLocalDateString(dayDate)
          const dayOfWeekIndex = toLocalDayOfWeek(dayDate)
          const dayOfWeekLabel = DAY_OF_WEEK_LABELS[dayOfWeekIndex] ?? 'desconhecido'

          // Gerar todos os slots sequenciais do dia
          let slotStart = startMinutes
          while (slotStart + config.slotDuration <= endMinutes) {
            const slotEnd = slotStart + config.slotDuration

            const slotStartIso = toIsoWithBrOffset(dateStr, minutesToTime(slotStart))
            const slotEndIso = toIsoWithBrOffset(dateStr, minutesToTime(slotEnd))

            const slotStartDate = new Date(slotStartIso)
            const slotEndDate = new Date(slotEndIso)

            // Verificar conflito com appointments existentes
            // Conflito: slotStart < apptEnd && slotEnd > apptStart
            const hasConflict = existingAppointments.some(
              (appt) =>
                slotStartDate < appt.endDate && slotEndDate > appt.startDate,
            )

            if (!hasConflict) {
              slots.push({
                date: dateStr,
                dayOfWeek: dayOfWeekLabel,
                startTime: minutesToTime(slotStart),
                endTime: minutesToTime(slotEnd),
                startIso: slotStartIso,
              })
            }

            slotStart += config.slotDuration

            // Limitar para não poluir o contexto do LLM
            if (slots.length >= MAX_SLOTS_TO_RETURN) break
          }

          if (slots.length >= MAX_SLOTS_TO_RETURN) break
        }

        const rangeDescription = date
          ? `no dia ${date}`
          : `nos próximos ${config.daysAhead} dias`

        logger.info('Tool list_availability executed', {
          dealId: ctx.dealId,
          conversationId: ctx.conversationId,
          daysAhead: config.daysAhead,
          slotDuration: config.slotDuration,
          slotsFound: slots.length,
          requestedDate: date ?? null,
          requestedTime: time ?? null,
        })

        if (slots.length === 0) {
          return {
            success: true,
            message: `Nenhum horário disponível ${rangeDescription}.`,
            slots: [],
            totalSlots: 0,
          }
        }

        return {
          success: true,
          message: `Encontrei ${slots.length} horário(s) disponível(is) ${rangeDescription}.`,
          slots,
          totalSlots: slots.length,
        }
      } catch (error) {
        logger.error('Tool list_availability failed', { error })
        return {
          success: false,
          message: 'Erro interno ao consultar disponibilidade. Tente novamente.',
        }
      }
    },
  })
}

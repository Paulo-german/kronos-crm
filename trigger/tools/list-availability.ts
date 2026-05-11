import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import {
  getAppointmentsByDateRange,
  getAppointmentsByDateRangeForProfessional,
} from '@/_data-access/appointment/get-appointments-by-date-range'
import type { DistributionModel } from '@prisma/client'
import type { ToolContext } from './types'

interface AvailabilitySlot {
  date: string       // "2026-03-15"
  dayOfWeek: string  // "sábado"
  startTime: string  // "09:00"
  endTime: string    // "09:30"
  startIso: string   // "2026-03-15T09:00:00-03:00"
  professionalId?: string  // preenchido apenas em fluxo SERVICE
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
  triggerHint?: string
}

const MAX_SLOTS_TO_RETURN = 5
const TIMEZONE = 'America/Sao_Paulo'
const BRAZIL_OFFSET = '-03:00'
const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

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

interface WorkingWindow {
  start: number // minutos
  end: number   // minutos
}

/**
 * Resolve a janela efetiva de trabalho de um profissional num dia específico,
 * priorizando exceção (OFF ou CUSTOM_HOURS) sobre WorkingHours padrão.
 * Retorna null se o profissional não trabalha no dia.
 *
 * Importante: a coluna `date` da exceção é @db.Date — para comparação correta
 * usamos a meia-noite UTC do dia consultado.
 */
async function resolveWorkingWindow(
  professionalId: string,
  utcDateMidnight: Date,
  dayOfWeek: number,
): Promise<WorkingWindow | null> {
  const exception = await db.workingHoursException.findFirst({
    where: { professionalId, date: utcDateMidnight },
    select: { type: true, startTime: true, endTime: true },
  })

  if (exception?.type === 'OFF') return null

  if (
    exception?.type === 'CUSTOM_HOURS' &&
    exception.startTime &&
    exception.endTime
  ) {
    return {
      start: timeToMinutes(exception.startTime),
      end: timeToMinutes(exception.endTime),
    }
  }

  const workingHours = await db.workingHours.findFirst({
    where: { professionalId, dayOfWeek },
    select: { startTime: true, endTime: true },
  })

  if (!workingHours) return null

  return {
    start: timeToMinutes(workingHours.startTime),
    end: timeToMinutes(workingHours.endTime),
  }
}

/**
 * Constrói uma Date UTC à meia-noite a partir de "YYYY-MM-DD" — necessário
 * para comparar com colunas `@db.Date` do Prisma.
 */
function utcMidnightFromDateString(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

interface SelectProfessionalParams {
  organizationId: string
  serviceId: string
  contactId: string
  primary: DistributionModel
  secondary: DistributionModel | null
}

/**
 * Aplica DistributionModel para escolher o profissional que vai atender o
 * serviço quando o cliente não solicitou um específico. Retorna o ID
 * escolhido ou null caso não haja profissional elegível.
 */
async function selectProfessionalByDistribution(
  params: SelectProfessionalParams,
): Promise<string | null> {
  const { organizationId, serviceId, contactId, primary, secondary } = params

  const eligible = await db.professionalService.findMany({
    where: {
      serviceId,
      professional: { isActive: true, organizationId },
    },
    select: { professionalId: true },
    orderBy: { professionalId: 'asc' },
  })

  const eligibleIds = eligible.map((row) => row.professionalId)
  if (eligibleIds.length === 0) return null
  if (eligibleIds.length === 1) return eligibleIds[0]

  return applyDistributionModel({
    model: primary,
    organizationId,
    contactId,
    professionalIds: eligibleIds,
    fallback: secondary,
  })
}

interface ApplyDistributionParams {
  model: DistributionModel
  organizationId: string
  contactId: string
  professionalIds: string[]
  fallback: DistributionModel | null
}

async function applyDistributionModel(
  params: ApplyDistributionParams,
): Promise<string | null> {
  const { model, organizationId, contactId, professionalIds } = params

  if (model === 'UTILIZATION') {
    return pickByUtilization(organizationId, professionalIds)
  }

  if (model === 'ROUND_ROBIN') {
    return pickByRoundRobin(organizationId, professionalIds)
  }

  if (model === 'FIRST_AVAILABLE') {
    // Sem cálculo real de availability aqui — escolhemos o primeiro elegível
    // e deixamos a geração de slots descobrir indisponibilidade dia a dia.
    return professionalIds[0] ?? null
  }

  if (model === 'MANUAL') {
    const manual = await pickByManualOrder(organizationId, professionalIds)
    if (manual) return manual
    return pickByUtilization(organizationId, professionalIds)
  }

  if (model === 'LOYALTY') {
    const loyaltyChoice = await pickByLoyalty(
      organizationId,
      contactId,
      professionalIds,
    )
    if (loyaltyChoice) return loyaltyChoice

    // Sem histórico → cai para o modelo secundário (default UTILIZATION)
    const fallbackModel: DistributionModel = params.fallback ?? 'UTILIZATION'
    if (fallbackModel === 'LOYALTY') {
      // Evita loop infinito caso a org configure LOYALTY como secundário
      return pickByUtilization(organizationId, professionalIds)
    }
    return applyDistributionModel({
      model: fallbackModel,
      organizationId,
      contactId,
      professionalIds,
      fallback: null,
    })
  }

  return professionalIds[0] ?? null
}

async function pickByUtilization(
  organizationId: string,
  professionalIds: string[],
): Promise<string | null> {
  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const startOfWeek = new Date(now.getTime() - dayOfWeek * DAY_MS)
  startOfWeek.setUTCHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek.getTime() + WEEK_MS)

  const counts = await Promise.all(
    professionalIds.map(async (professionalId) => ({
      professionalId,
      count: await db.appointment.count({
        where: {
          professionalId,
          organizationId,
          status: { notIn: ['CANCELED', 'NO_SHOW'] },
          startDate: { gte: startOfWeek, lt: endOfWeek },
        },
      }),
    })),
  )

  counts.sort((a, b) => a.count - b.count)
  return counts[0]?.professionalId ?? null
}

async function pickByRoundRobin(
  organizationId: string,
  professionalIds: string[],
): Promise<string | null> {
  const lastAppt = await db.appointment.findFirst({
    where: {
      organizationId,
      professionalId: { in: professionalIds },
    },
    select: { professionalId: true },
    orderBy: { startDate: 'desc' },
  })

  if (!lastAppt?.professionalId) return professionalIds[0] ?? null

  const lastIdx = professionalIds.indexOf(lastAppt.professionalId)
  if (lastIdx < 0) return professionalIds[0] ?? null

  const nextIdx = (lastIdx + 1) % professionalIds.length
  return professionalIds[nextIdx] ?? null
}

async function pickByLoyalty(
  organizationId: string,
  contactId: string,
  professionalIds: string[],
): Promise<string | null> {
  const previous = await db.appointment.findFirst({
    where: {
      organizationId,
      contactId,
      professionalId: { in: professionalIds },
    },
    select: { professionalId: true },
    orderBy: { startDate: 'desc' },
  })

  return previous?.professionalId ?? null
}

async function pickByManualOrder(
  organizationId: string,
  professionalIds: string[],
): Promise<string | null> {
  const orders = await db.manualProfessionalOrder.findMany({
    where: {
      organizationId,
      professionalId: { in: professionalIds },
    },
    select: { professionalId: true, order: true },
    orderBy: { order: 'asc' },
  })

  return orders[0]?.professionalId ?? null
}

export function createListAvailabilityTool(
  ctx: ToolContext,
  config: ListAvailabilityConfig,
) {
  const baseDescription =
    'Consulta horários disponíveis na agenda. Use ANTES de sugerir horários ao cliente. ' +
    'Para serviços (SERVICE), informe serviceId. Para combinar com um profissional específico, informe professionalId. ' +
    'Aceita parâmetros opcionais: date (YYYY-MM-DD) para consultar um dia específico, ' +
    'e time (HH:MM) junto com date para verificar se um slot exato está livre.'
  const description = config.triggerHint
    ? `${baseDescription}\n\nQuando usar esta instância: ${config.triggerHint}`
    : baseDescription

  return tool({
    description,
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
      serviceId: z
        .string()
        .optional()
        .describe('ID do serviço — use para fluxo SERVICE (agendamento de serviço).'),
      professionalId: z
        .string()
        .optional()
        .describe(
          'ID do profissional específico (quando o cliente solicitou). Apenas aplicável em fluxo SERVICE.',
        ),
    }),
    execute: async ({
      date,
      time,
      serviceId,
      professionalId,
    }): Promise<ListAvailabilityResult> => {
      try {
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

        if (serviceId) {
          return await runServiceFlow({
            ctx,
            config,
            date,
            time,
            serviceId,
            professionalId,
          })
        }

        return await runCommercialFlow({ ctx, config, date, time })
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

interface RunCommercialFlowParams {
  ctx: ToolContext
  config: ListAvailabilityConfig
  date: string | undefined
  time: string | undefined
}

/**
 * Fluxo legado deal-based (COMMERCIAL) — mantém a lógica original:
 * gera slots da janela config.startTime/endTime do responsável do deal.
 */
async function runCommercialFlow(
  params: RunCommercialFlowParams,
): Promise<ListAvailabilityResult> {
  const { ctx, config, date, time } = params

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

  const now = new Date()
  const todayStr = toLocalDateString(now)

  if (date && date < todayStr) {
    return { success: false, message: 'Não é possível consultar datas no passado.' }
  }

  // Determinar janela de busca
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
      new Date(rangeStart.getTime() + config.daysAhead * DAY_MS),
    )
    rangeEnd = new Date(`${rangeEndDateStr}T23:59:59${BRAZIL_OFFSET}`)
    searchDays = config.daysAhead
  }

  const existingAppointments = await getAppointmentsByDateRange(
    ctx.organizationId,
    deal.assignedTo,
    rangeStart,
    rangeEnd,
  )

  // Slot exato (date + time)
  if (date && time) {
    return checkExactSlot({
      ctx,
      config,
      date,
      time,
      now,
      existingAppointments,
    })
  }

  const slots = generateSlotsInWindow({
    rangeStart,
    searchDays,
    windowStart: timeToMinutes(config.startTime),
    windowEnd: timeToMinutes(config.endTime),
    slotDuration: config.slotDuration,
    existingAppointments,
  })

  const rangeDescription = date
    ? `no dia ${date}`
    : `nos próximos ${config.daysAhead} dias`

  logger.info('Tool list_availability executed (COMMERCIAL)', {
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
}

interface RunServiceFlowParams {
  ctx: ToolContext
  config: ListAvailabilityConfig
  date: string | undefined
  time: string | undefined
  serviceId: string
  professionalId: string | undefined
}

/**
 * Fluxo SERVICE: usa duration do service como slotDuration, respeita
 * WorkingHours/WorkingHoursException do profissional e seleciona profissional
 * via DistributionModel quando não solicitado.
 */
async function runServiceFlow(
  params: RunServiceFlowParams,
): Promise<ListAvailabilityResult> {
  const { ctx, config, date, time, serviceId, professionalId } = params

  const service = await db.service.findFirst({
    where: { id: serviceId, organizationId: ctx.organizationId, isActive: true },
    select: { id: true, duration: true, name: true },
  })

  if (!service) {
    return { success: false, message: 'Serviço não encontrado ou inativo.' }
  }

  // Resolver profissional: solicitado pelo cliente ou via DistributionModel
  let resolvedProfessionalId: string | null = null

  if (professionalId) {
    const requested = await db.professional.findFirst({
      where: {
        id: professionalId,
        organizationId: ctx.organizationId,
        isActive: true,
        professionalServices: { some: { serviceId } },
      },
      select: { id: true },
    })

    if (!requested) {
      return {
        success: false,
        message: 'Este profissional não atende o serviço solicitado ou está inativo.',
      }
    }

    resolvedProfessionalId = requested.id
  } else {
    const org = await db.organization.findFirst({
      where: { id: ctx.organizationId },
      select: { distributionModel: true, secondaryDistributionModel: true },
    })

    if (!org) {
      return { success: false, message: 'Organização não encontrada.' }
    }

    resolvedProfessionalId = await selectProfessionalByDistribution({
      organizationId: ctx.organizationId,
      serviceId,
      contactId: ctx.contactId,
      primary: org.distributionModel,
      secondary: org.secondaryDistributionModel,
    })
  }

  if (!resolvedProfessionalId) {
    return {
      success: false,
      message: 'Nenhum profissional disponível para este serviço no momento.',
    }
  }

  const now = new Date()
  const todayStr = toLocalDateString(now)

  if (date && date < todayStr) {
    return { success: false, message: 'Não é possível consultar datas no passado.' }
  }

  const slotDuration = service.duration
  const searchDays = date ? 1 : config.daysAhead

  const startDateStr = date ?? todayStr
  const rangeStart = new Date(`${startDateStr}T00:00:00${BRAZIL_OFFSET}`)
  const rangeEndDateStr = date
    ? startDateStr
    : toLocalDateString(new Date(rangeStart.getTime() + searchDays * DAY_MS))
  const rangeEnd = new Date(`${rangeEndDateStr}T23:59:59${BRAZIL_OFFSET}`)

  const existingAppointments = await getAppointmentsByDateRangeForProfessional(
    ctx.organizationId,
    resolvedProfessionalId,
    rangeStart,
    rangeEnd,
  )

  // Slot exato (date + time): valida contra working window do dia
  if (date && time) {
    const utcMidnight = utcMidnightFromDateString(date)
    const dayOfWeek = utcMidnight.getUTCDay()
    const workingWindow = await resolveWorkingWindow(
      resolvedProfessionalId,
      utcMidnight,
      dayOfWeek,
    )

    if (!workingWindow) {
      return {
        success: true,
        slotAvailable: false,
        message: `O profissional não trabalha em ${date}.`,
        slots: [],
        totalSlots: 0,
      }
    }

    return checkExactSlot({
      ctx,
      config: {
        ...config,
        slotDuration,
        startTime: minutesToTime(workingWindow.start),
        endTime: minutesToTime(workingWindow.end),
      },
      date,
      time,
      now,
      existingAppointments,
      professionalId: resolvedProfessionalId,
    })
  }

  const slots: AvailabilitySlot[] = []

  for (let dayOffset = 0; dayOffset < searchDays; dayOffset++) {
    const dayDate = new Date(rangeStart.getTime() + dayOffset * DAY_MS)
    const dateStr = toLocalDateString(dayDate)
    const utcMidnight = utcMidnightFromDateString(dateStr)
    const dayOfWeek = utcMidnight.getUTCDay()
    const dayOfWeekLabel = DAY_OF_WEEK_LABELS[dayOfWeek] ?? 'desconhecido'

    const workingWindow = await resolveWorkingWindow(
      resolvedProfessionalId,
      utcMidnight,
      dayOfWeek,
    )
    if (!workingWindow) continue

    const daySlots = generateSlotsInWindow({
      rangeStart: new Date(`${dateStr}T00:00:00${BRAZIL_OFFSET}`),
      searchDays: 1,
      windowStart: workingWindow.start,
      windowEnd: workingWindow.end,
      slotDuration,
      existingAppointments,
      dayOfWeekLabelOverride: dayOfWeekLabel,
      professionalIdTag: resolvedProfessionalId,
      remainingCapacity: MAX_SLOTS_TO_RETURN - slots.length,
    })

    slots.push(...daySlots)
    if (slots.length >= MAX_SLOTS_TO_RETURN) break
  }

  const rangeDescription = date ? `no dia ${date}` : `nos próximos ${config.daysAhead} dias`

  logger.info('Tool list_availability executed (SERVICE)', {
    organizationId: ctx.organizationId,
    conversationId: ctx.conversationId,
    serviceId,
    professionalId: resolvedProfessionalId,
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
}

interface CheckExactSlotParams {
  ctx: ToolContext
  config: ListAvailabilityConfig
  date: string
  time: string
  now: Date
  existingAppointments: Array<{ startDate: Date; endDate: Date }>
  professionalId?: string
}

function checkExactSlot(params: CheckExactSlotParams): ListAvailabilityResult {
  const { ctx, config, date, time, now, existingAppointments, professionalId } = params

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
    organizationId: ctx.organizationId,
    dealId: ctx.dealId,
    conversationId: ctx.conversationId,
    date,
    time,
    available: !hasConflict,
    professionalId: professionalId ?? null,
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
    slots: [
      {
        date,
        dayOfWeek: dayOfWeekLabel,
        startTime: time,
        endTime: minutesToTime(requestedEnd),
        startIso: slotStartIso,
        ...(professionalId ? { professionalId } : {}),
      },
    ],
    totalSlots: 1,
  }
}

interface GenerateSlotsParams {
  rangeStart: Date
  searchDays: number
  windowStart: number  // minutos
  windowEnd: number    // minutos
  slotDuration: number
  existingAppointments: Array<{ startDate: Date; endDate: Date }>
  dayOfWeekLabelOverride?: string
  professionalIdTag?: string
  remainingCapacity?: number
}

function generateSlotsInWindow(params: GenerateSlotsParams): AvailabilitySlot[] {
  const {
    rangeStart,
    searchDays,
    windowStart,
    windowEnd,
    slotDuration,
    existingAppointments,
    dayOfWeekLabelOverride,
    professionalIdTag,
    remainingCapacity,
  } = params

  const capacity = remainingCapacity ?? MAX_SLOTS_TO_RETURN
  const slots: AvailabilitySlot[] = []

  for (let dayOffset = 0; dayOffset < searchDays; dayOffset++) {
    const dayDate = new Date(rangeStart.getTime() + dayOffset * DAY_MS)
    const dateStr = toLocalDateString(dayDate)
    const dayOfWeekIndex = toLocalDayOfWeek(dayDate)
    const dayOfWeekLabel =
      dayOfWeekLabelOverride ?? DAY_OF_WEEK_LABELS[dayOfWeekIndex] ?? 'desconhecido'

    let slotStart = windowStart
    while (slotStart + slotDuration <= windowEnd) {
      const slotEnd = slotStart + slotDuration

      const slotStartIso = toIsoWithBrOffset(dateStr, minutesToTime(slotStart))
      const slotEndIso = toIsoWithBrOffset(dateStr, minutesToTime(slotEnd))

      const slotStartDate = new Date(slotStartIso)
      const slotEndDate = new Date(slotEndIso)

      const hasConflict = existingAppointments.some(
        (appt) => slotStartDate < appt.endDate && slotEndDate > appt.startDate,
      )

      if (!hasConflict) {
        slots.push({
          date: dateStr,
          dayOfWeek: dayOfWeekLabel,
          startTime: minutesToTime(slotStart),
          endTime: minutesToTime(slotEnd),
          startIso: slotStartIso,
          ...(professionalIdTag ? { professionalId: professionalIdTag } : {}),
        })
      }

      slotStart += slotDuration

      if (slots.length >= capacity) return slots
    }
  }

  return slots
}

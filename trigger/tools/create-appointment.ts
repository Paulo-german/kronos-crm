import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import { revalidateTags } from './lib/revalidate-tags'
import { withRetry, safeBestEffort } from './lib/with-retry'
import type { ToolContext } from './types'

interface CreateAppointmentResult {
  success: boolean
  message: string
}

export interface CreateAppointmentConfig {
  startTime?: string  // "HH:MM" — horário mínimo permitido
  endTime?: string    // "HH:MM" — horário máximo permitido
  triggerHint?: string
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

function extractLocalTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${hour}:${minute}`
}

function validateTimeWindow(date: Date, startTime: string, endTime: string): string | null {
  const local = extractLocalTime(date)
  const eventMinutes = timeToMinutes(local)
  if (eventMinutes < timeToMinutes(startTime) || eventMinutes >= timeToMinutes(endTime)) {
    return `Horário fora da janela permitida. Agende entre ${startTime} e ${endTime} (horário de Brasília).`
  }
  return null
}

const inputSchema = z
  .object({
    type: z
      .enum(['MEETING', 'BOOKING'])
      .describe(
        'Tipo do agendamento: MEETING para reuniões/demos vinculadas a um negócio, BOOKING para serviços agendados (profissional + serviço).',
      ),
    title: z.string().describe('Título do compromisso (ex: "Reunião de apresentação")'),
    description: z.string().optional().describe('Descrição ou pauta do compromisso'),
    startDate: z
      .string()
      .describe(
        'Data/hora início ISO 8601 com fuso horário de Brasília (ex: 2026-03-10T14:00:00-03:00).',
      ),
    endDate: z
      .string()
      .optional()
      .describe(
        'Data/hora término ISO 8601. Obrigatório para MEETING. Para BOOKING é calculado automaticamente a partir do duration do serviço.',
      ),
    serviceId: z
      .string()
      .optional()
      .describe('ID do serviço — obrigatório para BOOKING.'),
    professionalId: z
      .string()
      .optional()
      .describe('ID do profissional — obrigatório para BOOKING.'),
  })
  .superRefine((data, issueCtx) => {
    if (data.type === 'BOOKING') {
      if (!data.serviceId) {
        issueCtx.addIssue({
          code: 'custom',
          message: 'serviceId obrigatório para BOOKING',
          path: ['serviceId'],
        })
      }
      if (!data.professionalId) {
        issueCtx.addIssue({
          code: 'custom',
          message: 'professionalId obrigatório para BOOKING',
          path: ['professionalId'],
        })
      }
    }
    if (data.type === 'MEETING' && !data.endDate) {
      issueCtx.addIssue({
        code: 'custom',
        message: 'endDate obrigatório para MEETING',
        path: ['endDate'],
      })
    }
  })

export function createCreateAppointmentTool(ctx: ToolContext, config: CreateAppointmentConfig = {}) {
  const timeWindowHint =
    config.startTime && config.endTime
      ? ` Somente agende horários entre ${config.startTime} e ${config.endTime} (horário de Brasília).`
      : ''

  const baseDescription =
    'Cria um agendamento. Dois tipos suportados: MEETING (reunião/demo vinculada a um negócio) e BOOKING (serviço agendado com profissional). ' +
    'Use BOOKING quando o cliente quer marcar um serviço da empresa. Use MEETING para conversas comerciais vinculadas a um negócio.' +
    timeWindowHint

  const description = config.triggerHint
    ? `${baseDescription}\n\nQuando usar esta instância: ${config.triggerHint}`
    : baseDescription

  return tool({
    description,
    inputSchema,
    execute: async (input): Promise<CreateAppointmentResult> => {
      try {
        if (input.type === 'BOOKING') {
          return await runServiceCreation(ctx, input, config)
        }
        return await runCommercialCreation(ctx, input, config)
      } catch (error) {
        logger.error('Tool create_appointment failed', { error })
        return {
          success: false,
          message: 'Erro interno ao criar agendamento. Tente novamente.',
        }
      }
    },
  })
}

async function runCommercialCreation(
  ctx: ToolContext,
  input: z.infer<typeof inputSchema>,
  config: CreateAppointmentConfig,
): Promise<CreateAppointmentResult> {
  if (!ctx.dealId) {
    return {
      success: false,
      message: 'Nenhum negócio vinculado a esta conversa.',
    }
  }

  // endDate é garantido para MEETING pelo superRefine, mas o tipo Zod ainda o trata como opcional
  if (!input.endDate) {
    return { success: false, message: 'endDate obrigatório para MEETING.' }
  }

  const deal = await db.deal.findFirst({
    where: { id: ctx.dealId, organizationId: ctx.organizationId },
    select: { assignedTo: true, stage: { select: { pipelineId: true } } },
  })

  if (!deal) {
    return { success: false, message: 'Negócio não encontrado.' }
  }

  if (!ctx.pipelineIds.includes(deal.stage.pipelineId)) {
    return { success: false, message: 'Sem permissão para este pipeline.' }
  }

  const parsedStart = new Date(input.startDate)
  const parsedEnd = new Date(input.endDate)

  if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
    return { success: false, message: 'Data(s) inválida(s).' }
  }

  if (parsedEnd <= parsedStart) {
    return {
      success: false,
      message: 'A data de término deve ser posterior à data de início.',
    }
  }

  if (config.startTime && config.endTime) {
    const windowError = validateTimeWindow(parsedStart, config.startTime, config.endTime)
    if (windowError) return { success: false, message: windowError }
  }

  const overlapping = await db.appointment.findFirst({
    where: {
      assignedTo: deal.assignedTo,
      organizationId: ctx.organizationId,
      status: { notIn: ['CANCELED', 'NO_SHOW'] },
      startDate: { lt: parsedEnd },
      endDate: { gt: parsedStart },
    },
    select: { id: true, title: true, startDate: true, endDate: true },
  })

  if (overlapping) {
    const fmt = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    })
    return {
      success: false,
      message: `Já existe um compromisso neste horário: "${overlapping.title}" (${fmt.format(overlapping.startDate)} – ${fmt.format(overlapping.endDate)}). Escolha outro horário.`,
    }
  }

  const dealId = ctx.dealId

  await withRetry(
    () =>
      db.appointment.create({
        data: {
          organizationId: ctx.organizationId,
          type: 'MEETING',
          title: input.title,
          description: input.description ?? null,
          startDate: parsedStart,
          endDate: parsedEnd,
          status: 'SCHEDULED',
          assignedTo: deal.assignedTo,
          dealId,
          contactId: ctx.contactId,
        },
      }),
    'db.appointment.create',
  )

  await safeBestEffort(
    () =>
      db.activity.create({
        data: {
          type: 'appointment_created',
          content: `Compromisso agendado: ${input.title}`,
          dealId,
          performedBy: null,
          metadata: { agentId: ctx.agentId, agentName: ctx.agentName },
        },
      }),
    'activity.create',
  )

  await safeBestEffort(
    () =>
      revalidateTags([
        `appointments:${ctx.organizationId}`,
        `deal-appointments:${dealId}`,
        `deal:${dealId}`,
      ]),
    'revalidateTags',
  )

  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })

  logger.info('Tool create_appointment executed (MEETING)', {
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    dealId,
    conversationId: ctx.conversationId,
  })

  return {
    success: true,
    message: `Compromisso "${input.title}" agendado para ${dateFormatter.format(parsedStart)}.`,
  }
}

async function runServiceCreation(
  ctx: ToolContext,
  input: z.infer<typeof inputSchema>,
  config: CreateAppointmentConfig,
): Promise<CreateAppointmentResult> {
  if (!input.serviceId || !input.professionalId) {
    return {
      success: false,
      message: 'serviceId e professionalId são obrigatórios para SERVICE.',
    }
  }

  const parsedStart = new Date(input.startDate)
  if (isNaN(parsedStart.getTime())) {
    return { success: false, message: 'Data de início inválida.' }
  }

  if (config.startTime && config.endTime) {
    const windowError = validateTimeWindow(parsedStart, config.startTime, config.endTime)
    if (windowError) return { success: false, message: windowError }
  }

  const professional = await db.professional.findFirst({
    where: {
      id: input.professionalId,
      organizationId: ctx.organizationId,
      isActive: true,
    },
    select: { id: true, userId: true, name: true },
  })

  if (!professional) {
    return {
      success: false,
      message: 'Profissional não encontrado ou inativo.',
    }
  }

  const service = await db.service.findFirst({
    where: {
      id: input.serviceId,
      organizationId: ctx.organizationId,
      isActive: true,
    },
    select: { id: true, duration: true, price: true, name: true },
  })

  if (!service) {
    return { success: false, message: 'Serviço não encontrado ou inativo.' }
  }

  // Garante que o profissional atende este serviço
  const offersService = await db.professionalService.findFirst({
    where: { professionalId: professional.id, serviceId: service.id },
    select: { id: true },
  })

  if (!offersService) {
    return {
      success: false,
      message: 'Este profissional não atende o serviço informado.',
    }
  }

  const parsedEnd = new Date(parsedStart.getTime() + service.duration * 60_000)

  const overlapping = await db.appointment.findFirst({
    where: {
      professionalId: professional.id,
      organizationId: ctx.organizationId,
      status: { notIn: ['CANCELED', 'NO_SHOW'] },
      startDate: { lt: parsedEnd },
      endDate: { gt: parsedStart },
    },
    select: { id: true, title: true, startDate: true, endDate: true },
  })

  if (overlapping) {
    const fmt = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    })
    return {
      success: false,
      message: `Já existe um agendamento neste horário para ${professional.name}: "${overlapping.title}" (${fmt.format(overlapping.startDate)} – ${fmt.format(overlapping.endDate)}). Escolha outro horário.`,
    }
  }

  // assignedTo: prioriza o User do profissional; senão, owner da organização
  let resolvedUserId: string | null = professional.userId
  if (!resolvedUserId) {
    const owner = await db.member.findFirst({
      where: {
        organizationId: ctx.organizationId,
        role: 'OWNER',
        userId: { not: null },
      },
      select: { userId: true },
    })
    if (!owner?.userId) {
      return {
        success: false,
        message: 'Não foi possível determinar o responsável pelo agendamento.',
      }
    }
    resolvedUserId = owner.userId
  }
  const assignedTo = resolvedUserId

  await withRetry(
    () =>
      db.appointment.create({
        data: {
          organizationId: ctx.organizationId,
          type: 'BOOKING',
          title: input.title,
          description: input.description ?? null,
          startDate: parsedStart,
          endDate: parsedEnd,
          status: 'SCHEDULED',
          assignedTo,
          professionalId: professional.id,
          serviceId: service.id,
          contactId: ctx.contactId,
          priceSnapshot: service.price,
        },
      }),
    'db.appointment.create',
  )

  await safeBestEffort(
    () => revalidateTags([`appointments:${ctx.organizationId}`]),
    'revalidateTags',
  )

  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })

  logger.info('Tool create_appointment executed (SERVICE)', {
    title: input.title,
    startDate: input.startDate,
    serviceId: service.id,
    professionalId: professional.id,
    contactId: ctx.contactId,
    organizationId: ctx.organizationId,
    conversationId: ctx.conversationId,
  })

  return {
    success: true,
    message: `Agendamento "${service.name}" criado com ${professional.name} para ${dateFormatter.format(parsedStart)}.`,
  }
}

// Tipo exportado para narrowing externo se necessário (mantém parity com convenção do projeto)
export type CreateAppointmentInput = z.infer<typeof inputSchema>

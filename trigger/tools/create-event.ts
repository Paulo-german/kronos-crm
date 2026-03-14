import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import { revalidateTags } from './lib/revalidate-tags'
import type { ToolContext } from './types'

interface CreateEventResult {
  success: boolean
  message: string
}

export interface CreateEventConfig {
  titleInstructions: string
  duration: number    // minutos
  startTime: string   // "HH:MM" — horário mínimo permitido para agendamento
  endTime: string     // "HH:MM" — horário máximo permitido para agendamento
}

/**
 * Formata duração em minutos para label legível (ex: 60 -> "1h", 90 -> "1h 30min")
 */
function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
}

/**
 * Converte "HH:MM" em minutos totais desde a meia-noite
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

/**
 * Extrai "HH:MM" de um Date no timezone de Brasília
 */
function extractLocalTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  return `${hour}:${minute}`
}

export function createCreateEventTool(ctx: ToolContext, config: CreateEventConfig) {
  const durationLabel = formatDurationLabel(config.duration)

  return tool({
    description:
      `Agenda um evento vinculado ao negócio. Para o título, siga estas instruções: ${config.titleInstructions}. ` +
      `O evento terá duração de ${durationLabel}. ` +
      `Somente agende horários entre ${config.startTime} e ${config.endTime} (horário de Brasília). ` +
      `Não agende eventos fora desse intervalo.`,
    inputSchema: z.object({
      title: z
        .string()
        .describe('Título do evento seguindo as instruções fornecidas'),
      description: z
        .string()
        .optional()
        .describe('Descrição ou pauta do evento'),
      startDate: z
        .string()
        .describe(
          `Data/hora início ISO 8601 com fuso horário de Brasília (ex: 2026-03-10T14:00:00-03:00). Deve estar entre ${config.startTime} e ${config.endTime}.`,
        ),
      // endDate NÃO recebido do LLM — calculado: startDate + config.duration
    }),
    execute: async ({
      title,
      description,
      startDate,
    }): Promise<CreateEventResult> => {
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

      const parsedStart = new Date(startDate)

      if (isNaN(parsedStart.getTime())) {
        return { success: false, message: 'Data de início inválida.' }
      }

      // Validar que o horário está dentro da janela configurada no step builder
      const localTime = extractLocalTime(parsedStart)
      const startMinutes = timeToMinutes(config.startTime)
      const endMinutes = timeToMinutes(config.endTime)
      const eventStartMinutes = timeToMinutes(localTime)

      if (eventStartMinutes < startMinutes || eventStartMinutes >= endMinutes) {
        return {
          success: false,
          message: `Horário fora da janela permitida. Agende entre ${config.startTime} e ${config.endTime} (horário de Brasília).`,
        }
      }

      // endDate calculado a partir do startDate + duration — o LLM não precisa informar
      const parsedEnd = new Date(parsedStart.getTime() + config.duration * 60_000)

      await db.appointment.create({
        data: {
          organizationId: ctx.organizationId,
          title,
          description: description ?? null,
          startDate: parsedStart,
          endDate: parsedEnd,
          status: 'SCHEDULED',
          assignedTo: deal.assignedTo,
          dealId: ctx.dealId,
        },
      })

      await db.activity.create({
        data: {
          type: 'appointment_created',
          content: `Evento agendado: ${title}`,
          dealId: ctx.dealId,
          performedBy: null,
          metadata: { agentId: ctx.agentId, agentName: ctx.agentName },
        },
      })

      const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
        timeStyle: 'short',
      })

      await revalidateTags([
        `appointments:${ctx.organizationId}`,
        `deal-appointments:${ctx.dealId}`,
        `deal:${ctx.dealId}`,
      ])

      logger.info('Tool create_event executed', {
        title,
        startDate,
        endDate: parsedEnd.toISOString(),
        duration: config.duration,
        dealId: ctx.dealId,
        conversationId: ctx.conversationId,
      })

      return {
        success: true,
        message: `Evento "${title}" agendado para ${dateFormatter.format(parsedStart)} (duração: ${durationLabel}).`,
      }
    },
  })
}

import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import { revalidateTags } from './lib/revalidate-tags'
import type { ToolContext } from './types'

interface CreateAppointmentResult {
  success: boolean
  message: string
}

export function createCreateAppointmentTool(ctx: ToolContext) {
  return tool({
    description:
      'Agenda um compromisso (reunião, demo, visita) vinculado ao negócio. Use quando combinar um encontro ou chamada com o cliente.',
    inputSchema: z.object({
      title: z
        .string()
        .describe('Título do compromisso (ex: "Reunião de apresentação")'),
      description: z
        .string()
        .optional()
        .describe('Descrição ou pauta do compromisso'),
      startDate: z
        .string()
        .describe(
          'Data/hora início ISO 8601 (ex: 2026-03-10T14:00:00)',
        ),
      endDate: z
        .string()
        .describe(
          'Data/hora término ISO 8601 (ex: 2026-03-10T15:00:00)',
        ),
    }),
    execute: async ({
      title,
      description,
      startDate,
      endDate,
    }): Promise<CreateAppointmentResult> => {
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
      const parsedEnd = new Date(endDate)

      if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
        return { success: false, message: 'Data(s) inválida(s).' }
      }

      if (parsedEnd <= parsedStart) {
        return {
          success: false,
          message: 'A data de término deve ser posterior à data de início.',
        }
      }

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
          content: `Compromisso agendado: ${title}`,
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
        `deal:${ctx.dealId}`,
        `deals:${ctx.organizationId}`,
      ]).catch(() => {})

      logger.info('Tool create_appointment executed', {
        title,
        startDate,
        endDate,
        dealId: ctx.dealId,
        conversationId: ctx.conversationId,
      })

      return {
        success: true,
        message: `Compromisso "${title}" agendado para ${dateFormatter.format(parsedStart)}.`,
      }
    },
  })
}

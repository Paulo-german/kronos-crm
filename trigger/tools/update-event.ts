import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import { revalidateTags } from './lib/revalidate-tags'
import { withRetry, safeBestEffort } from './lib/with-retry'
import type { ToolContext } from './types'

interface UpdateEventResult {
  success: boolean
  message: string
}

export function createUpdateEventTool(ctx: ToolContext) {
  return tool({
    description:
      'Reagenda um evento existente para nova data/hora. Use quando o cliente solicitar mudança de horário. Você precisa do ID do evento (disponível nos dados do negócio).',
    inputSchema: z.object({
      callReason: z
        .string()
        .min(10)
        .describe(
          'Motivo curto (1 frase) do porquê esta ferramenta está sendo chamada agora, referenciando o gatilho do Processo de Atendimento que justifica a ação. Obrigatório para auditoria.',
        ),
      appointmentId: z
        .string()
        .describe('ID do evento a ser reagendado'),
      newStartDate: z
        .string()
        .describe(
          'Nova data/hora início ISO 8601 com fuso horário de Brasília (ex: 2026-03-10T14:00:00-03:00)',
        ),
    }),
    execute: async ({ appointmentId, newStartDate }): Promise<UpdateEventResult> => {
      try {
      if (!ctx.dealId) {
        return {
          success: false,
          message: 'Nenhum negócio vinculado a esta conversa.',
        }
      }

      // Buscar appointment validando que pertence à org e ao deal do contexto
      const appointment = await db.appointment.findFirst({
        where: {
          id: appointmentId,
          organizationId: ctx.organizationId,
          dealId: ctx.dealId,
        },
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
          assignedTo: true,
          deal: {
            select: { stage: { select: { pipelineId: true } } },
          },
        },
      })

      if (!appointment) {
        return {
          success: false,
          message: 'Evento não encontrado ou não pertence a este negócio.',
        }
      }

      if (!ctx.pipelineIds.includes(appointment.deal.stage.pipelineId)) {
        return { success: false, message: 'Sem permissão para este pipeline.' }
      }

      // Só permite reagendar eventos com status SCHEDULED
      if (appointment.status !== 'SCHEDULED') {
        return {
          success: false,
          message: `Não é possível reagendar um evento com status "${appointment.status}". Apenas eventos agendados podem ser alterados.`,
        }
      }

      const parsedNewStart = new Date(newStartDate)

      if (isNaN(parsedNewStart.getTime())) {
        return { success: false, message: 'Nova data de início inválida.' }
      }

      // Preservar a duração original do evento ao reagendar
        const originalDurationMs = appointment.endDate.getTime() - appointment.startDate.getTime()
        const newEndDate = new Date(parsedNewStart.getTime() + originalDurationMs)

        // Verificar conflito de horário no novo período (excluindo o próprio evento)
        const overlapping = await db.appointment.findFirst({
          where: {
            id: { not: appointmentId },
            assignedTo: appointment.assignedTo,
            organizationId: ctx.organizationId,
            status: { notIn: ['CANCELED', 'NO_SHOW'] },
            startDate: { lt: newEndDate },
            endDate: { gt: parsedNewStart },
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

        await withRetry(
          () =>
            db.appointment.update({
              where: { id: appointmentId },
              data: {
                startDate: parsedNewStart,
                endDate: newEndDate,
              },
            }),
          'db.appointment.update',
        )

        await safeBestEffort(
          () =>
            db.activity.create({
              data: {
                type: 'appointment_updated',
                content: `Evento reagendado: ${appointment.title}`,
                dealId: ctx.dealId!,
                performedBy: null,
                metadata: {
                  agentId: ctx.agentId,
                  agentName: ctx.agentName,
                  previousStartDate: appointment.startDate.toISOString(),
                  newStartDate: parsedNewStart.toISOString(),
                },
              },
            }),
          'activity.create',
        )

        const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          dateStyle: 'short',
          timeStyle: 'short',
        })

        await safeBestEffort(
          () =>
            revalidateTags([
              `appointments:${ctx.organizationId}`,
              `deal-appointments:${ctx.dealId}`,
              `deal:${ctx.dealId}`,
            ]),
          'revalidateTags',
        )

        logger.info('Tool update_event executed', {
          appointmentId,
          newStartDate,
          newEndDate: newEndDate.toISOString(),
          dealId: ctx.dealId,
          conversationId: ctx.conversationId,
        })

        return {
          success: true,
          message: `Evento "${appointment.title}" reagendado para ${dateFormatter.format(parsedNewStart)}.`,
        }
      } catch (error) {
        logger.error('Tool update_event failed', { error })
        return {
          success: false,
          message: 'Erro interno ao reagendar evento. Tente novamente.',
        }
      }
    },
  })
}

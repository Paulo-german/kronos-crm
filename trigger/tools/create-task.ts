import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import type { ToolContext } from './types'

interface CreateTaskResult {
  success: boolean
  message: string
}

export function createCreateTaskTool(ctx: ToolContext) {
  return tool({
    description:
      'Cria uma tarefa de follow-up vinculada ao negócio. Use quando combinar algo com o cliente (ex: enviar proposta, agendar reunião).',
    inputSchema: z.object({
      title: z.string().describe('Título descritivo da tarefa'),
      dueDate: z
        .string()
        .describe(
          'Data de vencimento no formato ISO 8601 (ex: 2026-03-01T14:00:00)',
        ),
    }),
    execute: async ({ title, dueDate }): Promise<CreateTaskResult> => {
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
        select: { assignedTo: true },
      })

      if (!deal) {
        return { success: false, message: 'Negócio não encontrado.' }
      }

      const parsedDate = new Date(dueDate)
      if (isNaN(parsedDate.getTime())) {
        return { success: false, message: 'Data inválida.' }
      }

      await db.task.create({
        data: {
          organizationId: ctx.organizationId,
          title,
          dueDate: parsedDate,
          dealId: ctx.dealId,
          assignedTo: deal.assignedTo,
          createdBy: deal.assignedTo,
          type: 'TASK',
        },
      })

      await db.activity.create({
        data: {
          type: 'task_created',
          content: title,
          dealId: ctx.dealId,
          performedBy: null,
        },
      })

      logger.info('Tool create_task executed', {
        title,
        dueDate,
        dealId: ctx.dealId,
        conversationId: ctx.conversationId,
      })

      return { success: true, message: `Tarefa "${title}" criada com sucesso.` }
    },
  })
}

import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import { revalidateTags } from './lib/revalidate-tags'
import { withRetry, safeBestEffort } from './lib/with-retry'
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

      const parsedDate = new Date(dueDate)
      if (isNaN(parsedDate.getTime())) {
        return { success: false, message: 'Data inválida.' }
      }

        await withRetry(
          () =>
            db.task.create({
              data: {
                organizationId: ctx.organizationId,
                title,
                dueDate: parsedDate,
                dealId: ctx.dealId!,
                assignedTo: deal.assignedTo,
                createdBy: deal.assignedTo,
                type: 'TASK',
              },
            }),
          'db.task.create',
        )

        await safeBestEffort(
          () =>
            db.activity.create({
              data: {
                type: 'task_created',
                content: title,
                dealId: ctx.dealId!,
                performedBy: null,
                metadata: { agentId: ctx.agentId, agentName: ctx.agentName },
              },
            }),
          'activity.create',
        )

        await safeBestEffort(
          () =>
            revalidateTags([
              `deal:${ctx.dealId}`,
              `deals:${ctx.organizationId}`,
              `tasks:${ctx.organizationId}`,
            ]),
          'revalidateTags',
        )

        logger.info('Tool create_task executed', {
          title,
          dueDate,
          dealId: ctx.dealId,
          conversationId: ctx.conversationId,
        })

        return { success: true, message: `Tarefa "${title}" criada com sucesso.` }
      } catch (error) {
        logger.error('Tool create_task failed', { error })
        return {
          success: false,
          message: 'Erro interno ao criar tarefa. Tente novamente.',
        }
      }
    },
  })
}

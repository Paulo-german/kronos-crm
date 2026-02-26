import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import type { ToolContext } from './types'

interface MoveDealResult {
  success: boolean
  message: string
}

export function createMoveDealTool(ctx: ToolContext) {
  return tool({
    description:
      'Move um negócio para outra etapa do pipeline de vendas. Use quando o cliente avançar ou regredir no funil.',
    inputSchema: z.object({
      dealId: z.string().uuid().describe('ID do negócio a mover'),
      stageId: z.string().uuid().describe('ID da nova etapa do pipeline'),
    }),
    execute: async ({ dealId, stageId }): Promise<MoveDealResult> => {
      const deal = await db.deal.findFirst({
        where: {
          id: dealId,
          organizationId: ctx.organizationId,
        },
        include: {
          stage: {
            include: { pipeline: true },
          },
        },
      })

      if (!deal) {
        return { success: false, message: 'Negócio não encontrado nesta organização.' }
      }

      if (!ctx.pipelineIds.includes(deal.stage.pipelineId)) {
        return {
          success: false,
          message: 'Este agente não tem permissão para mover negócios neste pipeline.',
        }
      }

      const newStage = await db.pipelineStage.findFirst({
        where: {
          id: stageId,
          pipelineId: deal.stage.pipelineId,
        },
      })

      if (!newStage) {
        return { success: false, message: 'Etapa não pertence a este pipeline.' }
      }

      if (deal.pipelineStageId === stageId) {
        return { success: true, message: 'Negócio já está nesta etapa.' }
      }

      await db.deal.update({
        where: { id: dealId },
        data: {
          pipelineStageId: stageId,
          ...(deal.status === 'OPEN' && { status: 'IN_PROGRESS' }),
        },
      })

      await db.activity.create({
        data: {
          type: 'stage_change',
          content: `${deal.stage.name} → ${newStage.name}`,
          dealId,
          performedBy: null,
        },
      })

      logger.info('Tool move_deal executed', {
        dealId,
        fromStage: deal.stage.name,
        toStage: newStage.name,
        conversationId: ctx.conversationId,
      })

      return {
        success: true,
        message: `Negócio movido de "${deal.stage.name}" para "${newStage.name}".`,
      }
    },
  })
}

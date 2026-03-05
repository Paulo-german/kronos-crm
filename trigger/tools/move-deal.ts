import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import { revalidateTags } from './lib/revalidate-tags'
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
      stageName: z
        .string()
        .describe(
          'Nome da etapa destino (ex: "Proposta Enviada"). Consulte [Etapas do pipeline] no system prompt.',
        ),
    }),
    execute: async ({ stageName }): Promise<MoveDealResult> => {
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

      if (deal.status === 'WON' || deal.status === 'LOST') {
        return {
          success: false,
          message: `Negócio já está finalizado (${deal.status === 'WON' ? 'GANHO' : 'PERDIDO'}).`,
        }
      }

      // Buscar todas as stages do pipeline para resolver por nome
      const pipelineStages = await db.pipelineStage.findMany({
        where: { pipelineId: deal.stage.pipelineId },
        orderBy: { position: 'asc' },
      })

      // Resolver stageName → stage: exact match (case-insensitive), fallback fuzzy (includes)
      const normalizedInput = stageName.trim().toLowerCase()

      let newStage = pipelineStages.find(
        (stage) => stage.name.toLowerCase() === normalizedInput,
      )

      if (!newStage) {
        newStage = pipelineStages.find((stage) =>
          stage.name.toLowerCase().includes(normalizedInput) ||
          normalizedInput.includes(stage.name.toLowerCase()),
        )
      }

      if (!newStage) {
        const validNames = pipelineStages.map((stage) => stage.name).join(', ')
        return {
          success: false,
          message: `Etapa "${stageName}" não encontrada. Etapas válidas: ${validNames}`,
        }
      }

      if (deal.pipelineStageId === newStage.id) {
        return { success: true, message: 'Negócio já está nesta etapa.' }
      }

      await db.deal.update({
        where: { id: ctx.dealId },
        data: {
          pipelineStageId: newStage.id,
          ...(deal.status === 'OPEN' && { status: 'IN_PROGRESS' }),
        },
      })

      await db.activity.create({
        data: {
          type: 'stage_change',
          content: `${deal.stage.name} → ${newStage.name}`,
          dealId: ctx.dealId,
          performedBy: null,
          metadata: { agentId: ctx.agentId, agentName: ctx.agentName },
        },
      })

      await revalidateTags([
        `pipeline:${ctx.organizationId}`,
        `deals:${ctx.organizationId}`,
        `deal:${ctx.dealId}`,
        `dashboard:${ctx.organizationId}`,
        `dashboard-charts:${ctx.organizationId}`,
      ]).catch(() => {})

      logger.info('Tool move_deal executed', {
        dealId: ctx.dealId,
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

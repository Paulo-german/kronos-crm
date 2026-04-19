import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import { revalidateTags } from './lib/revalidate-tags'
import { withRetry, safeBestEffort } from './lib/with-retry'
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
      callReason: z
        .string()
        .min(10)
        .describe(
          'Motivo curto (1 frase) do porquê esta ferramenta está sendo chamada agora, referenciando o gatilho do Processo de Atendimento que justifica a ação. Obrigatório para auditoria.',
        ),
      targetStageId: z
        .string()
        .describe(
          'ID (UUID) da etapa de destino no pipeline.',
        ),
    }),
    execute: async ({ targetStageId }): Promise<MoveDealResult> => {
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

      // Resolver targetStageId → stage por ID direto
      const newStage = await db.pipelineStage.findFirst({
        where: {
          id: targetStageId,
          pipelineId: deal.stage.pipelineId,
        },
      })

      if (!newStage) {
        return {
          success: false,
          message: `Etapa com ID "${targetStageId}" não encontrada neste pipeline.`,
        }
      }

      if (deal.pipelineStageId === newStage.id) {
        return { success: true, message: 'Negócio já está nesta etapa.' }
      }

        await withRetry(
          () =>
            db.deal.update({
              where: { id: ctx.dealId! },
              data: {
                pipelineStageId: newStage.id,
                ...(deal.status === 'OPEN' && { status: 'IN_PROGRESS' }),
              },
            }),
          'db.deal.update',
        )

        await safeBestEffort(
          () =>
            db.activity.create({
              data: {
                type: 'stage_change',
                content: `${deal.stage.name} → ${newStage.name}`,
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
              `pipeline:${ctx.organizationId}`,
              `deals:${ctx.organizationId}`,
              `deal:${ctx.dealId}`,
              `dashboard:${ctx.organizationId}`,
              `dashboard-charts:${ctx.organizationId}`,
            ]),
          'revalidateTags',
        )

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
      } catch (error) {
        logger.error('Tool move_deal failed', { error })
        return {
          success: false,
          message: 'Erro interno ao mover negócio. Tente novamente.',
        }
      }
    },
  })
}

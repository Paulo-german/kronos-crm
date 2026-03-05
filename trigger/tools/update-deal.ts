import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import { revalidateTags } from './lib/revalidate-tags'
import type { ToolContext } from './types'

interface UpdateDealResult {
  success: boolean
  message: string
}

export function createUpdateDealTool(ctx: ToolContext) {
  return tool({
    description:
      'Atualiza dados de um negócio (título, valor, prioridade, previsão de fechamento, notas, status). Use quando o cliente informar valor, prazo, ou quando o negócio for ganho ou perdido.',
    inputSchema: z.object({
      title: z.string().optional().describe('Novo título do negócio'),
      value: z
        .number()
        .min(0)
        .optional()
        .describe('Valor do negócio em reais (ex: 15000)'),
      priority: z
        .enum(['low', 'medium', 'high', 'urgent'])
        .optional()
        .describe('Prioridade do negócio'),
      expectedCloseDate: z
        .string()
        .optional()
        .describe(
          'Previsão de fechamento ISO 8601 (ex: 2026-04-15T00:00:00)',
        ),
      notes: z
        .string()
        .optional()
        .describe('Notas a adicionar ao negócio (concatenadas com notas existentes)'),
      status: z
        .enum(['WON', 'LOST'])
        .optional()
        .describe('Marcar negócio como ganho (WON) ou perdido (LOST)'),
      reason: z
        .string()
        .optional()
        .describe(
          'Motivo da perda (quando status = LOST). Use exatamente um dos motivos listados em [Motivos de perda disponíveis] no system prompt.',
        ),
    }),
    execute: async (input): Promise<UpdateDealResult> => {
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
        include: { stage: true },
      })

      if (!deal) {
        return { success: false, message: 'Negócio não encontrado.' }
      }

      if (!ctx.pipelineIds.includes(deal.stage.pipelineId)) {
        return {
          success: false,
          message:
            'Este agente não tem permissão para atualizar negócios neste pipeline.',
        }
      }

      // Fix 3: Guard contra deals já finalizados
      if ((deal.status === 'WON' || deal.status === 'LOST') && input.status) {
        return {
          success: false,
          message: `Negócio já está finalizado (${deal.status === 'WON' ? 'GANHO' : 'PERDIDO'}).`,
        }
      }

      // Construir dados para atualização
      const data: Record<string, unknown> = {}
      const updatedFields: string[] = []

      if (input.title !== undefined) {
        data.title = input.title
        updatedFields.push(`título: "${input.title}"`)
      }

      if (input.value !== undefined) {
        data.value = input.value
        updatedFields.push(
          `valor: R$ ${input.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        )
      }

      if (input.priority !== undefined) {
        data.priority = input.priority
        updatedFields.push(`prioridade: ${input.priority}`)
      }

      // Fix 4: Notes append em vez de overwrite
      if (input.notes !== undefined) {
        data.notes = deal.notes ? `${deal.notes}\n\n---\n${input.notes}` : input.notes
        updatedFields.push('notas atualizadas')
      }

      if (input.expectedCloseDate !== undefined) {
        const parsedDate = new Date(input.expectedCloseDate)
        if (isNaN(parsedDate.getTime())) {
          return { success: false, message: 'Data de previsão inválida.' }
        }
        data.expectedCloseDate = parsedDate
        updatedFields.push(
          `previsão: ${parsedDate.toLocaleDateString('pt-BR')}`,
        )
      }

      if (input.status === 'WON') {
        data.status = 'WON'
        updatedFields.push('status: GANHO')
      } else if (input.status === 'LOST') {
        data.status = 'LOST'
        updatedFields.push('status: PERDIDO')

        // Fix 2: Vincular lossReasonId — exact match primeiro, fuzzy como fallback
        if (input.reason) {
          const reasons = await db.dealLostReason.findMany({
            where: { organizationId: ctx.organizationId, isActive: true },
          })
          const reasonLower = input.reason.toLowerCase().trim()
          const matched =
            reasons.find((r) => r.name.toLowerCase() === reasonLower) ??
            reasons.find(
              (r) =>
                reasonLower.includes(r.name.toLowerCase()) ||
                r.name.toLowerCase().includes(reasonLower),
            )
          if (matched) {
            data.lossReasonId = matched.id
          }
        }
      }

      if (updatedFields.length === 0) {
        return {
          success: false,
          message: 'Nenhum campo para atualizar foi informado.',
        }
      }

      await db.deal.update({
        where: { id: ctx.dealId },
        data,
      })

      // Criar Activity
      if (input.status === 'WON') {
        await db.activity.create({
          data: {
            type: 'deal_won',
            content: `Negócio marcado como ganho pelo agente`,
            dealId: ctx.dealId,
            performedBy: null,
            metadata: { agentId: ctx.agentId, agentName: ctx.agentName },
          },
        })
      } else if (input.status === 'LOST') {
        const lostContent = input.reason
          ? `Negócio marcado como perdido pelo agente. Motivo: ${input.reason}`
          : 'Negócio marcado como perdido pelo agente'
        await db.activity.create({
          data: {
            type: 'deal_lost',
            content: lostContent,
            dealId: ctx.dealId,
            performedBy: null,
            metadata: { agentId: ctx.agentId, agentName: ctx.agentName },
          },
        })
      } else {
        await db.activity.create({
          data: {
            type: 'note',
            content: `Negócio atualizado pelo agente: ${updatedFields.join(', ')}`,
            dealId: ctx.dealId,
            performedBy: null,
            metadata: { agentId: ctx.agentId, agentName: ctx.agentName },
          },
        })
      }

      // Fix 1c: Invalidar cache
      await revalidateTags([
        `pipeline:${ctx.organizationId}`,
        `deals:${ctx.organizationId}`,
        `deals-options:${ctx.organizationId}`,
        `deal:${ctx.dealId}`,
        `dashboard:${ctx.organizationId}`,
        `dashboard-charts:${ctx.organizationId}`,
      ]).catch(() => {})

      logger.info('Tool update_deal executed', {
        dealId: ctx.dealId,
        updatedFields,
        conversationId: ctx.conversationId,
      })

      return {
        success: true,
        message: `Negócio atualizado: ${updatedFields.join(', ')}.`,
      }
    },
  })
}

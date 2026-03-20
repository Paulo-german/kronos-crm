import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import { revalidateTags } from './lib/revalidate-tags'
import { withRetry, safeBestEffort } from './lib/with-retry'
import { stepActionSchema } from '@/_actions/agent/shared/step-action-schema'
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

      // Guard contra deals já finalizados
      if ((deal.status === 'WON' || deal.status === 'LOST') && input.status) {
        return {
          success: false,
          message: `Negócio já está finalizado (${deal.status === 'WON' ? 'GANHO' : 'PERDIDO'}).`,
        }
      }

      // Agregar constraints de allowedFields/allowedStatuses/fixedPriority de todos os steps
      const agentSteps = await db.agentStep.findMany({
        where: { agentId: ctx.agentId },
        select: { actions: true },
      })

      let aggregatedAllowedFields: string[] | null = null
      let aggregatedAllowedStatuses: ('WON' | 'LOST')[] | null = null
      let aggregatedFixedPriority: string | undefined

      for (const step of agentSteps) {
        const parsed = z.array(stepActionSchema).safeParse(step.actions)
        if (!parsed.success) continue
        for (const act of parsed.data) {
          if (act.type !== 'update_deal') continue
          if (act.allowedFields.length > 0) {
            aggregatedAllowedFields = [
              ...(aggregatedAllowedFields ?? []),
              ...act.allowedFields,
            ]
          }
          if (act.allowedStatuses.length > 0) {
            aggregatedAllowedStatuses = [
              ...(aggregatedAllowedStatuses ?? []),
              ...act.allowedStatuses,
            ]
          }
          if (act.fixedPriority) {
            aggregatedFixedPriority = act.fixedPriority
          }
        }
      }

      // Aplicar fixedPriority (sobrescreve o que a IA enviou)
      const effectiveInput = { ...input }
      if (aggregatedFixedPriority) {
        effectiveInput.priority = aggregatedFixedPriority as 'low' | 'medium' | 'high' | 'urgent'
      }

      // Bloquear status não permitido
      if (aggregatedAllowedStatuses !== null && effectiveInput.status) {
        if (!aggregatedAllowedStatuses.includes(effectiveInput.status)) {
          return {
            success: false,
            message: `Não é permitido marcar o negócio como ${effectiveInput.status} nesta etapa.`,
          }
        }
      }

      // Construir dados para atualização
      const data: Record<string, unknown> = {}
      const updatedFields: string[] = []

      const isFieldAllowed = (field: string) =>
        aggregatedAllowedFields === null || aggregatedAllowedFields.includes(field)

      if (effectiveInput.title !== undefined && isFieldAllowed('title')) {
        data.title = effectiveInput.title
        updatedFields.push(`título: "${effectiveInput.title}"`)
      }

      if (effectiveInput.value !== undefined && isFieldAllowed('value')) {
        data.value = effectiveInput.value
        updatedFields.push(
          `valor: R$ ${effectiveInput.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        )
      }

      if (effectiveInput.priority !== undefined && isFieldAllowed('priority')) {
        data.priority = effectiveInput.priority
        updatedFields.push(`prioridade: ${effectiveInput.priority}`)
      }

      // Notes append em vez de overwrite
      if (effectiveInput.notes !== undefined && isFieldAllowed('notes')) {
        data.notes = deal.notes ? `${deal.notes}\n\n---\n${effectiveInput.notes}` : effectiveInput.notes
        updatedFields.push('notas atualizadas')
      }

      if (effectiveInput.expectedCloseDate !== undefined && isFieldAllowed('expectedCloseDate')) {
        const parsedDate = new Date(effectiveInput.expectedCloseDate)
        if (isNaN(parsedDate.getTime())) {
          return { success: false, message: 'Data de previsão inválida.' }
        }
        data.expectedCloseDate = parsedDate
        updatedFields.push(
          `previsão: ${parsedDate.toLocaleDateString('pt-BR')}`,
        )
      }

      if (effectiveInput.status === 'WON') {
        data.status = 'WON'
        updatedFields.push('status: GANHO')
      } else if (effectiveInput.status === 'LOST') {
        data.status = 'LOST'
        updatedFields.push('status: PERDIDO')

        // Vincular lossReasonId — exact match primeiro, fuzzy como fallback
        if (effectiveInput.reason) {
          const reasons = await db.dealLostReason.findMany({
            where: { organizationId: ctx.organizationId, isActive: true },
          })
          const reasonLower = effectiveInput.reason.toLowerCase().trim()
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

        await withRetry(
          () => db.deal.update({ where: { id: ctx.dealId! }, data }),
          'db.deal.update',
        )

        // Criar Activity
        if (effectiveInput.status === 'WON') {
          await safeBestEffort(
            () =>
              db.activity.create({
                data: {
                  type: 'deal_won',
                  content: `Negócio marcado como ganho pelo agente`,
                  dealId: ctx.dealId!,
                  performedBy: null,
                  metadata: { agentId: ctx.agentId, agentName: ctx.agentName },
                },
              }),
            'activity.create',
          )
        } else if (effectiveInput.status === 'LOST') {
          const lostContent = effectiveInput.reason
            ? `Negócio marcado como perdido pelo agente. Motivo: ${effectiveInput.reason}`
            : 'Negócio marcado como perdido pelo agente'
          await safeBestEffort(
            () =>
              db.activity.create({
                data: {
                  type: 'deal_lost',
                  content: lostContent,
                  dealId: ctx.dealId!,
                  performedBy: null,
                  metadata: { agentId: ctx.agentId, agentName: ctx.agentName },
                },
              }),
            'activity.create',
          )
        } else {
          await safeBestEffort(
            () =>
              db.activity.create({
                data: {
                  type: 'note',
                  content: `Negócio atualizado pelo agente: ${updatedFields.join(', ')}`,
                  dealId: ctx.dealId!,
                  performedBy: null,
                  metadata: { agentId: ctx.agentId, agentName: ctx.agentName },
                },
              }),
            'activity.create',
          )
        }

        // Invalidar cache
        await safeBestEffort(
          () =>
            revalidateTags([
              `pipeline:${ctx.organizationId}`,
              `deals:${ctx.organizationId}`,
              `deals-options:${ctx.organizationId}`,
              `deal:${ctx.dealId}`,
              `dashboard:${ctx.organizationId}`,
              `dashboard-charts:${ctx.organizationId}`,
            ]),
          'revalidateTags',
        )

        logger.info('Tool update_deal executed', {
          dealId: ctx.dealId,
          updatedFields,
          conversationId: ctx.conversationId,
        })

        return {
          success: true,
          message: `Negócio atualizado: ${updatedFields.join(', ')}.`,
        }
      } catch (error) {
        logger.error('Tool update_deal failed', { error })
        return {
          success: false,
          message: 'Erro interno ao atualizar negócio. Tente novamente.',
        }
      }
    },
  })
}

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

export function createUpdateDealTool(ctx: ToolContext, opts?: { triggerHint?: string }) {
  const baseDescription =
    'Atualiza dados de um negócio (título, valor, prioridade, previsão de fechamento, notas). Use quando o cliente informar valor, prazo ou outros dados do negócio.'
  const description = opts?.triggerHint
    ? `${baseDescription}\n\nQuando usar esta instância: ${opts.triggerHint}`
    : baseDescription

  return tool({
    description,
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

      // Deny-by-default: agregar apenas os campos explicitamente permitidos
      const agentSteps = await db.agentStep.findMany({
        where: { agentId: ctx.agentId },
        select: { actions: true },
      })

      const allowedFields = new Set<string>()
      let fixedPriority: 'low' | 'medium' | 'high' | 'urgent' | undefined

      for (const step of agentSteps) {
        const parsed = z.array(stepActionSchema).safeParse(step.actions)
        if (!parsed.success) continue
        for (const act of parsed.data) {
          if (act.type !== 'update_deal') continue
          for (const field of act.allowedFields) allowedFields.add(field)
          if (act.fixedPriority) fixedPriority = act.fixedPriority
        }
      }

      // Aplicar fixedPriority (sobrescreve o que a IA enviou)
      const effectiveInput = { ...input }
      if (fixedPriority) {
        effectiveInput.priority = fixedPriority
      }

      // Construir dados para atualização
      const data: Record<string, unknown> = {}
      const updatedFields: string[] = []

      if (effectiveInput.title !== undefined && allowedFields.has('title')) {
        data.title = effectiveInput.title
        updatedFields.push(`título: "${effectiveInput.title}"`)
      }

      if (effectiveInput.value !== undefined && allowedFields.has('value')) {
        data.value = effectiveInput.value
        updatedFields.push(
          `valor: R$ ${effectiveInput.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        )
      }

      if (effectiveInput.priority !== undefined && allowedFields.has('priority')) {
        data.priority = effectiveInput.priority
        updatedFields.push(`prioridade: ${effectiveInput.priority}`)
      }

      // Notes append em vez de overwrite
      if (effectiveInput.notes !== undefined && allowedFields.has('notes')) {
        data.notes = deal.notes ? `${deal.notes}\n\n---\n${effectiveInput.notes}` : effectiveInput.notes
        updatedFields.push('notas atualizadas')
      }

      if (effectiveInput.expectedCloseDate !== undefined && allowedFields.has('expectedCloseDate')) {
        const parsedDate = new Date(effectiveInput.expectedCloseDate)
        if (isNaN(parsedDate.getTime())) {
          return { success: false, message: 'Data de previsão inválida.' }
        }
        data.expectedCloseDate = parsedDate
        updatedFields.push(
          `previsão: ${parsedDate.toLocaleDateString('pt-BR')}`,
        )
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

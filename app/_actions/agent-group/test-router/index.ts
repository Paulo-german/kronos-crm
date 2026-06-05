'use server'

import { generateObject } from 'ai'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getModel } from '@/_lib/ai/provider'
import { estimateMaxCost, calculateCreditCost } from '@/_lib/ai/pricing'
import { debitCredits, refundCredits } from '@/_lib/billing/credit-utils'
import {
  buildRouterSystemPrompt,
  routerResponseSchema,
  ROUTER_MAX_OUTPUT_TOKENS,
  type RouterConfig,
  type RouterActiveWorker,
} from '../../../../trigger/lib/build-router-prompt'
import { testRouterSchema, type TestRouterResult } from './schema'

export const testRouter = orgActionClient
  .schema(testRouterSchema)
  .action(async ({ parsedInput: { groupId, testMessage }, ctx }): Promise<TestRouterResult> => {
    requirePermission(canPerformAction(ctx, 'agentGroup', 'update'))

    const group = await db.agentGroup.findFirst({
      where: { id: groupId, organizationId: ctx.orgId },
      select: {
        routerModelId: true,
        routerPrompt: true,
        routerConfig: true,
        members: {
          include: {
            agent: {
              select: { id: true, name: true, isActive: true },
            },
          },
        },
      },
    })

    if (!group) throw new Error('Grupo não encontrado.')

    const activeWorkers: RouterActiveWorker[] = group.members.filter((member) => member.isActive)

    if (activeWorkers.length === 0) throw new Error('Grupo sem workers ativos.')

    // Atalho: único worker ativo → sem custo de LLM
    if (activeWorkers.length === 1) {
      const worker = activeWorkers[0]
      return {
        workerName: worker.agent.name,
        targetAgentId: worker.agentId,
        confidence: 1,
        reasoning: 'Único worker ativo no grupo — roteamento direto, sem custo de LLM.',
        wasFallback: false,
        creditsCost: 0,
      }
    }

    const routerConfig = group.routerConfig as RouterConfig | null

    const systemPrompt = buildRouterSystemPrompt({
      activeWorkers,
      routerConfig,
      routerPrompt: group.routerPrompt,
    })

    // Estimar tokens e debitar créditos (mesma política de produção)
    const estimatedInputTokens = Math.ceil(
      (systemPrompt.length + testMessage.length) / 4,
    )
    const costEstimate = estimateMaxCost(
      group.routerModelId,
      estimatedInputTokens,
      ROUTER_MAX_OUTPUT_TOKENS,
    )

    const debited = await debitCredits(ctx.orgId, costEstimate, 'Router test classification', {
      agentGroupId: groupId,
      type: 'router-test',
    })

    if (!debited) throw new Error('Créditos insuficientes para testar o roteamento.')

    let result: Awaited<ReturnType<typeof generateObject<typeof routerResponseSchema>>>

    try {
      result = await generateObject({
        model: getModel(group.routerModelId),
        schema: routerResponseSchema,
        system: systemPrompt,
        prompt: `user: ${testMessage}`,
        maxOutputTokens: ROUTER_MAX_OUTPUT_TOKENS,
      })
    } catch {
      await refundCredits(ctx.orgId, costEstimate, 'Refund — router test LLM error', {
        agentGroupId: groupId,
      }).catch(() => {})

      throw new Error('Erro ao chamar o modelo de roteamento. Tente novamente.')
    }

    // Reconciliar créditos (devolver excesso da estimativa)
    const totalTokens = (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0)
    const actualCost = calculateCreditCost(group.routerModelId, totalTokens)
    const creditDiff = costEstimate - actualCost
    if (creditDiff > 0) {
      await refundCredits(ctx.orgId, creditDiff, 'Router test credit adjustment', {
        agentGroupId: groupId,
      }).catch(() => {})
    }

    // Validar agente retornado contra workers ativos (mesma lógica de produção)
    const validWorker = activeWorkers.find((worker) => worker.agentId === result.object.targetAgentId)

    if (!validWorker) {
      const fallbackId = routerConfig?.fallbackAgentId
      const fallbackWorker = fallbackId
        ? activeWorkers.find((worker) => worker.agentId === fallbackId)
        : activeWorkers[0]
      const chosen = fallbackWorker ?? activeWorkers[0]

      return {
        workerName: chosen.agent.name,
        targetAgentId: chosen.agentId,
        confidence: 0.5,
        reasoning: 'O modelo retornou um agente inválido. Usando o worker de fallback.',
        wasFallback: true,
        creditsCost: actualCost,
      }
    }

    return {
      workerName: validWorker.agent.name,
      targetAgentId: validWorker.agentId,
      confidence: result.object.confidence,
      reasoning: result.object.reasoning,
      wasFallback: false,
      creditsCost: actualCost,
    }
  })

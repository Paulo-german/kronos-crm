import { generateObject } from 'ai'
import { z } from 'zod'
import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { getModel } from '@/_lib/ai/provider'
import { debitCredits, refundCredits } from '@/_lib/billing/credit-utils'
import { estimateMaxCost, calculateCreditCost } from '@/_lib/ai/pricing'
import { langfuseTracer } from './langfuse'

// ---------------------------------------------------------------------------
// Schema de resposta do router LLM
// ---------------------------------------------------------------------------

const routerResponseSchema = z.object({
  targetAgentId: z.string().uuid(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(200),
})

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface RouterConfig {
  fallbackAgentId: string | null
  rules?: Array<{
    agentId: string
    keywords?: string[]
    description?: string
  }>
}

interface RouterDecision {
  targetAgentId: string
  confidence: number
  reasoning: string
}

interface RouteConversationInput {
  groupId: string
  conversationId: string
  organizationId: string
  messageHistory: Array<{ role: string; content: string }>
}

// Máximo de tokens de saída para a classificação do router
const ROUTER_MAX_OUTPUT_TOKENS = 256

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

/**
 * Classifica a conversa e retorna o worker mais adequado.
 *
 * Comportamento:
 * - Se só existe 1 worker ativo: retorna direto sem custo de LLM
 * - Se múltiplos workers: usa LLM leve para classificar
 * - Valida que o agente retornado pertence ao grupo; usa fallback se inválido
 * - Registra AgentExecution com agentId=null (execução do router)
 * - Debita/reconcilia créditos do router
 */
export async function routeConversation(
  input: RouteConversationInput,
): Promise<(RouterDecision & { workerName: string }) | null> {
  // 1. Buscar grupo com config do router e membros ativos
  const group = await db.agentGroup.findUnique({
    where: { id: input.groupId },
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

  if (!group) return null

  const activeWorkers = group.members.filter((member) => member.isActive)

  if (activeWorkers.length === 0) return null

  // Atalho: único worker ativo → retornar direto sem custo de LLM
  if (activeWorkers.length === 1) {
    const worker = activeWorkers[0]
    return {
      targetAgentId: worker.agentId,
      confidence: 1,
      reasoning: 'Único worker ativo no grupo',
      workerName: worker.agent.name,
    }
  }

  // 2. Montar system prompt do router
  const routerConfig = group.routerConfig as RouterConfig | null

  const workerDescriptions = activeWorkers
    .map(
      (worker) =>
        `- Agent ID: "${worker.agentId}" | Nome: "${worker.agent.name}" | Escopo: "${worker.scopeLabel}"`,
    )
    .join('\n')

  const customRules = routerConfig?.rules
    ?.map((rule) => {
      const worker = activeWorkers.find((w) => w.agentId === rule.agentId)
      if (!worker) return null
      const parts = [`- Para "${worker.agent.name}"`]
      if (rule.keywords?.length) parts.push(`quando mencionado: ${rule.keywords.join(', ')}`)
      if (rule.description) parts.push(`regra: ${rule.description}`)
      return parts.join(' ')
    })
    .filter(Boolean)
    .join('\n')

  const fallbackInstruction = routerConfig?.fallbackAgentId
    ? `- Se nenhum worker for claramente adequado, direcione para o agente com ID "${routerConfig.fallbackAgentId}".`
    : '- Se nenhum worker for claramente adequado, escolha o mais generico.'

  const basePromptParts = [
    'Voce e um classificador de conversas. Sua funcao e analisar a mensagem do cliente e decidir qual agente especializado deve atende-lo.',
    '',
    '## Agentes Disponiveis',
    workerDescriptions,
    '',
    '## Regras',
    '- Analise a mensagem e o contexto para determinar a intencao do cliente.',
    '- Retorne o agentId do worker mais adequado.',
    fallbackInstruction,
    '- Responda APENAS no formato JSON solicitado.',
  ]

  if (customRules) {
    basePromptParts.push('', '## Regras Customizadas', customRules)
  }

  if (group.routerPrompt) {
    basePromptParts.push('', '## Instrucoes Adicionais', group.routerPrompt)
  }

  const systemPrompt = basePromptParts.join('\n')

  // 3. Preparar histórico de mensagens como texto para o router
  const userContent = input.messageHistory
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n')

  // 4. Estimar tokens e debitar créditos otimisticamente
  const estimatedInputTokens = Math.ceil(
    (systemPrompt.length + userContent.length) / 4,
  )
  const routerCostEstimate = estimateMaxCost(
    group.routerModelId,
    estimatedInputTokens,
    ROUTER_MAX_OUTPUT_TOKENS,
  )

  const debited = await debitCredits(
    input.organizationId,
    routerCostEstimate,
    'Router classification',
    {
      agentGroupId: input.groupId,
      conversationId: input.conversationId,
      model: group.routerModelId,
      type: 'router',
    },
  )

  if (!debited) {
    logger.warn('Router classification skipped: insufficient credits', {
      conversationId: input.conversationId,
      groupId: input.groupId,
      routerCostEstimate,
    })
    throw new Error('NO_CREDITS')
  }

  // 5. Chamar LLM com generateObject (resposta estruturada — reduz parsing manual)
  let result: Awaited<ReturnType<typeof generateObject<typeof routerResponseSchema>>>

  try {
    result = await generateObject({
      model: getModel(group.routerModelId),
      schema: routerResponseSchema,
      system: systemPrompt,
      prompt: userContent,
      maxOutputTokens: ROUTER_MAX_OUTPUT_TOKENS,
      experimental_telemetry: {
        isEnabled: true,
        tracer: langfuseTracer,
        functionId: 'router-classification',
        metadata: {
          groupId: input.groupId,
          conversationId: input.conversationId,
          organizationId: input.organizationId,
          model: group.routerModelId,
          workerCount: activeWorkers.length,
        },
      },
    })
  } catch (llmError) {
    const errorMessage = llmError instanceof Error ? llmError.message : String(llmError)

    logger.error('Router LLM call failed', {
      groupId: input.groupId,
      conversationId: input.conversationId,
      modelId: group.routerModelId,
      errorMessage,
    })

    // Devolver créditos em caso de falha do LLM
    await refundCredits(
      input.organizationId,
      routerCostEstimate,
      'Refund — router LLM error',
      { agentGroupId: input.groupId, conversationId: input.conversationId },
    ).catch((refundError) => {
      logger.error('Failed to refund router credits after LLM error', {
        refundError,
        groupId: input.groupId,
        conversationId: input.conversationId,
      })
    })

    // Re-throw preservando a mensagem original do LLM — o upstream classifica
    // via errorMessage === 'NO_CREDITS' (thrown antes deste catch, sem passar aqui).
    // Prefixos custom poluiriam o AgentExecution.errorMessage exibido na UI.
    throw llmError instanceof Error ? llmError : new Error(errorMessage)
  }

  // 6. Reconciliar créditos (refund do excesso)
  // SDK v6: usage tem inputTokens + outputTokens (promptTokens/completionTokens foram removidos)
  const routerInputTokens = result.usage.inputTokens ?? 0
  const routerOutputTokens = result.usage.outputTokens ?? 0
  const routerTotalTokens = routerInputTokens + routerOutputTokens
  const actualCost = calculateCreditCost(group.routerModelId, routerTotalTokens)
  const creditDiff = routerCostEstimate - actualCost
  if (creditDiff > 0) {
    await refundCredits(
      input.organizationId,
      creditDiff,
      'Router credit adjustment',
      { agentGroupId: input.groupId },
    ).catch(() => {})
  }

  // 7. Registrar como AgentExecution do grupo (agentId = null porque é o router, não um worker)
  await db.agentExecution
    .create({
      data: {
        agentId: null,
        agentGroupId: input.groupId,
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        status: 'COMPLETED',
        startedAt: new Date(),
        completedAt: new Date(),
        modelId: group.routerModelId,
        inputTokens: routerInputTokens,
        outputTokens: routerOutputTokens,
        creditsCost: actualCost,
      },
    })
    .catch((dbError) => {
      logger.warn('Failed to record router AgentExecution', {
        dbError,
        groupId: input.groupId,
        conversationId: input.conversationId,
      })
    })

  // 8. Validar que o agente retornado é um worker válido do grupo
  const validWorker = activeWorkers.find(
    (worker) => worker.agentId === result.object.targetAgentId,
  )

  if (!validWorker) {
    // Fallback: usar fallbackAgentId do config, ou primeiro worker ativo
    const fallbackId = routerConfig?.fallbackAgentId
    const fallbackWorker = fallbackId
      ? activeWorkers.find((w) => w.agentId === fallbackId)
      : activeWorkers[0]

    const chosen = fallbackWorker ?? activeWorkers[0]

    logger.warn('Router returned invalid agentId, using fallback', {
      returnedId: result.object.targetAgentId,
      fallbackId: chosen.agentId,
      conversationId: input.conversationId,
    })

    return {
      targetAgentId: chosen.agentId,
      confidence: 0.5,
      reasoning: 'Router retornou agente invalido, usando fallback',
      workerName: chosen.agent.name,
    }
  }

  return {
    ...result.object,
    workerName: validWorker.agent.name,
  }
}

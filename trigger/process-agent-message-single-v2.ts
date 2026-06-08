import {
  task,
  logger,
  metadata as triggerMetadata,
  AbortTaskRunError,
} from '@trigger.dev/sdk/v3'
import { observe, updateActiveTrace } from '@langfuse/tracing'
import { flushLangfuse, langfuseTracer, DEPLOY_VERSION } from './lib/langfuse'
import { buildDispatcherCtx } from './lib/build-dispatcher-ctx'
import type { ProcessAgentMessagePayload } from './lib/build-dispatcher-ctx'
import { handleAgentTaskFailure } from './lib/handle-task-failure'
import { generateText, stepCountIs } from 'ai'
import { getModel } from '@/_lib/ai/provider'
import { db } from '@/_lib/prisma'
import { estimateMaxCost } from '@/_lib/ai/pricing'
import { debitCredits } from '@/_lib/billing/credit-utils'
import { settleCredits } from './lib/settle-credits'
import { notifyNoCredits } from './lib/notify-no-credits'
import { sendPresence } from '@/_lib/evolution-js/send-message'
import { resolveEvolutionCredentialsByInstanceName } from '@/_lib/evolution-js/resolve-credentials'
import { compressMemory } from './lib/compress-memory'
import { sendOutboundMessage } from './lib/send-outbound-message'
import { extractAndSendInlineMedia } from './lib/extract-and-send-inline-media'
import { buildSystemPrompt } from './build-system-prompt'
import { buildToolSet } from './tools'
import { isSingleV2OverhaulEnabled } from './lib/feature-flags'
import { buildPromptBaseContext } from './lib/prompt-base-context'
import { compileSingleSystemPrompt } from './lib/prompt-single-compiler'
import type { GroupToolConfig } from './tools'
import {
  createConversationEvent,
  createToolEvents,
} from './lib/create-conversation-event'
import type {
  InfoSubtype,
  ProcessingErrorSubtype,
} from '@/_lib/conversation-events/types'
import { prefixAttendantName } from '@/_lib/inbox/prefix-attendant-name'
import { revalidateConversationCache } from './lib/revalidate-cache'
import { emitAgentStatus } from './lib/emit-agent-status'
import {
  saveAgentResponseSent,
  saveAgentResponseFailed,
} from './lib/save-agent-response'
import type { ToolContext } from './tools/types'
import type { DispatcherCtx } from './dispatcher-types'
import { GENERIC_SAFE_FALLBACK } from './lib/two-phase-types'
import { triggerHumanHandoff } from './lib/trigger-human-handoff'
import { runSingleFallback } from './agent/single-fallback'
import { runSingleGuard } from './agent/single-guard'
import { getProductCatalogForGuard } from './lib/product-catalog-cache'
import { createRetryableFetch } from './lib/retryable-fetch'
import {
  CALL1_EXECUTION_DIRECTIVE,
  CLASSIFIER_HISTORY_TURNS,
  IDEMPOTENT_TOOL_NAMES,
  LLM_TEMPERATURE,
  MAX_OUTPUT_TOKENS,
  MESSAGE_HISTORY_LIMIT,
} from './lib/pipeline-single-v2/constants'
import { buildLlmMessages, stripLeakedToolCalls } from './lib/pipeline-single-v2/message-utils'
import { runStepClassifier } from './lib/pipeline-single-v2/step-classifier'
import { runResponder } from './lib/pipeline-single-v2/responder'
import { applyStepAdvance } from './lib/pipeline-single-v2/step-advance'



// ---------------------------------------------------------------------------
// Tipos auxiliares do guard pipeline
// ---------------------------------------------------------------------------

interface PendingHumanHandoff {
  conversationId: string
  organizationId: string
  reason: string
  phaseTraceId: string
}

interface GuardPipelineResult {
  responseText: string
  pendingHumanHandoff: PendingHumanHandoff | null
}

// ---------------------------------------------------------------------------
// Guard + Fallback pipeline (Fase 3 — atrás da flag SINGLE_V2_OVERHAUL)
// Só executa quando há texto para validar; empty_response é tratado em runSingleV2.
// ---------------------------------------------------------------------------

async function applyGuardPipeline(params: {
  responseText: string
  conversationId: string
  organizationId: string
  modelId: string
  agentName: string
  steps: Array<{
    toolCalls?: Array<{ toolName: string; input: unknown }>
    toolResults?: Array<{ toolName: string; output: unknown }>
  }>
  llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  traceTags: string[]
}): Promise<GuardPipelineResult> {
  let { responseText } = params
  const {
    conversationId,
    organizationId,
    modelId,
    agentName,
    steps,
    llmMessages,
    traceTags,
  } = params

  let pendingHumanHandoff: PendingHumanHandoff | null = null

  // Extrair tools utilizadas nesta execução para contexto do guard
  const toolsUsed = steps.flatMap(
    (step) => step.toolCalls?.map((tc) => tc.toolName) ?? [],
  )

  // Cascata de seleção de produtos em contexto (seção 5.3 do plano):
  // 1. IDs dos produtos retornados por search_products nesta execução
  // 2. Substring match no catálogo completo contra o texto de resposta
  // 3. Se vazio: pular apenas price_mismatch (guard roda as demais categorias)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  let productsInContext: any[] = []

  try {
    // Passo 1: produtos retornados diretamente por search_products nos steps
    const searchProductsResults = steps.flatMap(
      (step) =>
        step.toolCalls
          ?.filter((tc) => tc.toolName === 'search_products')
          .map((tc) => {
            const toolResult = step.toolResults?.find(
              (tr) => tr.toolName === tc.toolName,
            )
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return toolResult?.output
          }) ?? [],
    )

    const productIdsFromTools = new Set<string>()
    for (const output of searchProductsResults) {
      if (
        output !== null &&
        output !== undefined &&
        typeof output === 'object' &&
        'products' in (output as Record<string, unknown>)
      ) {
        const outputRecord = output as Record<string, unknown>
        const products = outputRecord.products
        if (Array.isArray(products)) {
          for (const product of products) {
            if (
              typeof product === 'object' &&
              product !== null &&
              'id' in (product as Record<string, unknown>)
            ) {
              const productRecord = product as Record<string, unknown>
              if (typeof productRecord.id === 'string') {
                productIdsFromTools.add(productRecord.id)
              }
            }
          }
        }
      }
    }

    if (productIdsFromTools.size > 0) {
      // Buscar itens do catálogo apenas pelos IDs encontrados nos steps
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const fullCatalog = await getProductCatalogForGuard(organizationId)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      productsInContext = fullCatalog.filter((item: { id: string }) =>
        productIdsFromTools.has(item.id),
      )
    }

    // Passo 2: substring match no catálogo se ainda não encontramos produtos
    if (productsInContext.length === 0 && responseText) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const fullCatalog = await getProductCatalogForGuard(organizationId)
      const normalizedResponse = responseText.toLowerCase()
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      productsInContext = fullCatalog.filter((item: { name: string }) =>
        normalizedResponse.includes(item.name.toLowerCase()),
      )
    }

    // Passo 3: se ainda vazio, guard roda sem price_mismatch (flag para o guard)
    if (productsInContext.length === 0) {
      logger.info('single-guard: price validation skipped', {
        conversationId,
        reason: 'no_product_context',
      })
      triggerMetadata.set('priceValidationSkipped', true)
    }
  } catch (catalogError) {
    logger.warn(
      'single-guard: failed to load product catalog, skipping price validation',
      {
        conversationId,
        error:
          catalogError instanceof Error
            ? catalogError.message
            : String(catalogError),
      },
    )
    triggerMetadata.set('priceValidationSkipped', true)
  }

  // Guard attempt 1
  const guardStartMs = Date.now()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const guardResult1 = await runSingleGuard({
    customerMessage: responseText,
    context: { toolsUsed, productsInContext },
    conversationId,
    organizationId,
  })
  const guardDurationMs = Date.now() - guardStartMs

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const guard1Approved: boolean = guardResult1.approved === true
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const guard1Violations: Array<{
    type: string
    details: string
    confidence: number
  }> =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    Array.isArray(guardResult1.violations) ? guardResult1.violations : []

  logger.info('single-guard completed', {
    conversationId,
    organizationId,
    approved: guard1Approved,
    violationTypes: guard1Violations.map((v) => v.type),
    durationMs: guardDurationMs,
    attempt: 1,
  })

  triggerMetadata.set('guardApprovedOnFirstAttempt', guard1Approved)
  triggerMetadata.set('guardViolationType', guard1Violations[0]?.type ?? null)

  if (!guard1Approved) {
    // Guard rejeitou — invocar fallback para reescrita
    triggerMetadata.set('fallbackTriggered', true)
    traceTags.push('guard_rejected')

    const fallbackResult = await runSingleFallback({
      modelId,
      rejectedMessage: responseText,
      guardViolations: guard1Violations,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      correctedContext: guardResult1.correctedContext,
      // Passar apenas as mensagens sem o system prompt original para evitar conflito
      llmMessages: llmMessages.filter((m) => m.role !== 'system'),
      toolResults: steps,
      agentPersona: {
        name: agentName,
        // voice não está exposto no promptContext — o fallback usa apenas o nome
        voice: '',
      },
      conversationId,
      organizationId,
    }).catch((fallbackError) => {
      logger.warn('single-fallback call failed', {
        conversationId,
        error:
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError),
      })
      return null
    })

    const fallbackRawText = fallbackResult?.text
      ? stripLeakedToolCalls(fallbackResult.text)
          .replace(/\n{3,}/g, '\n\n')
          .trim()
      : ''

    if (fallbackRawText) {
      // Guard attempt 2 com o texto do fallback
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const guardResult2 = await runSingleGuard({
        customerMessage: fallbackRawText,
        context: { toolsUsed, productsInContext },
        conversationId,
        organizationId,
      })

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const guard2Approved: boolean = guardResult2.approved === true

      logger.info('single-guard completed', {
        conversationId,
        organizationId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        approved: guardResult2.approved,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        violationTypes: Array.isArray(guardResult2.violations)
          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            guardResult2.violations.map((v: { type: string }) => v.type)
          : [],
        attempt: 2,
      })

      if (guard2Approved) {
        // Fallback aprovado — usar como resposta final
        responseText = fallbackRawText
        traceTags.push('guard_fallback_approved')
      } else {
        // Degraded path: 2 rejeições consecutivas — escalar para humano
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const lastViolations: Array<{ type: string; details: string }> =
          Array.isArray(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            guardResult2.violations,
          )
            ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
              guardResult2.violations.map(
                (v: { type: string; details: string }) => ({
                  type: v.type,
                  details: v.details,
                }),
              )
            : []

        responseText = GENERIC_SAFE_FALLBACK
        pendingHumanHandoff = {
          conversationId,
          organizationId,
          reason:
            'Guard bloqueou resposta 2x consecutivas. Conversa encaminhada para atendente.',
          phaseTraceId: conversationId,
        }

        await createConversationEvent({
          conversationId,
          type: 'INFO',
          content:
            'Resposta do agente bloqueada pelo guard (2x). Conversa encaminhada para atendente humano.',
          metadata: {
            subtype: 'GUARD_ESCALATION' satisfies InfoSubtype,
            violations: lastViolations,
            attempts: 2,
          },
        })

        triggerMetadata.set('escalationTriggered', true)
        traceTags.push('guard_escalation')

        logger.info('single-guard: escalation triggered', {
          conversationId,
          organizationId,
          lastViolations,
        })
      }
    } else {
      // Fallback não gerou texto — degraded path imediato
      const lastViolations = guard1Violations.map((v) => ({
        type: v.type,
        details: v.details,
      }))

      responseText = GENERIC_SAFE_FALLBACK
      pendingHumanHandoff = {
        conversationId,
        organizationId,
        reason: 'Fallback não gerou resposta válida após rejeição do guard.',
        phaseTraceId: conversationId,
      }

      await createConversationEvent({
        conversationId,
        type: 'INFO',
        content:
          'Resposta do agente bloqueada pelo guard. Fallback sem resposta. Encaminhado para humano.',
        metadata: {
          subtype: 'GUARD_ESCALATION' satisfies InfoSubtype,
          violations: lastViolations,
          attempts: 1,
        },
      })

      triggerMetadata.set('escalationTriggered', true)
      traceTags.push('guard_escalation')
    }
  }

  return { responseText, pendingHumanHandoff }
}

// ---------------------------------------------------------------------------
// Pipeline Single V2 — Em desenvolvimento (alvo da reforma substancial)
// ---------------------------------------------------------------------------

export async function runSingleV2(
  ctx: DispatcherCtx,
): Promise<{ success: true } | { skipped: true; reason?: string }> {
  // ===================================================================
  // PIPELINE V2 — Fluxo single-agent (cópia exata do V1)
  // A partir daqui, nenhuma linha do v1 foi modificada.
  // ===================================================================
  // Determina o caminho de construção do system prompt uma única vez
  const useOverhaul = isSingleV2OverhaulEnabled()

  // No caminho de overhaul (Fase 2) a query de summary é feita separadamente;
  // no caminho legacy o summary já vem embutido no retorno de buildSystemPrompt.
  const [promptContext, messageHistory, conversation] = await Promise.all([
    useOverhaul
      ? buildPromptBaseContext(
          ctx.effectiveAgentId,
          ctx.conversationId,
          ctx.organizationId,
          ctx.groupPromptContext
            ? {
                groupId: ctx.groupPromptContext.groupId,
                currentAgentId: ctx.effectiveAgentId,
                workers: ctx.groupPromptContext.workers,
              }
            : null,
        ).then(async (base) => {
          const { summary } = await db.conversation.findUniqueOrThrow({
            where: { id: ctx.conversationId },
            select: { summary: true },
          })
          return compileSingleSystemPrompt(base, { summary })
        })
      : buildSystemPrompt(
          ctx.effectiveAgentId,
          ctx.conversationId,
          ctx.organizationId,
          ctx.groupPromptContext,
        ),
    db.message.findMany({
      where: {
        conversationId: ctx.conversationId,
        isArchived: false,
      },
      orderBy: { createdAt: 'asc' },
      take: MESSAGE_HISTORY_LIMIT,
      select: {
        role: true,
        content: true,
        metadata: true,
      },
    }),
    db.conversation.findUniqueOrThrow({
      where: { id: ctx.conversationId },
      select: {
        contactId: true,
        dealId: true,
        // Dados do inbox para resolver provider em send_product_media
        inbox: {
          select: {
            connectionType: true,
            channel: true,
            evolutionInstanceName: true,
            evolutionApiUrl: true,
            evolutionApiKey: true,
            metaPhoneNumberId: true,
            metaAccessToken: true,
            metaIgUserId: true,
            zapiInstanceId: true,
            zapiToken: true,
            zapiClientToken: true,
            showAttendantName: true,
          },
        },
      },
    }),
  ])

  ctx.log('step:4 context_loaded', 'PASS', {
    model: promptContext.modelId,
    historyCount: messageHistory.length,
    hasSummary: !!promptContext.summary,
    estimatedTokens: promptContext.estimatedTokens,
    contactName: promptContext.contactName,
  })
  ctx.tracker.addStep({
    type: 'CONTEXT_LOADING',
    status: 'PASSED',
    output: {
      model: promptContext.modelId,
      historyCount: messageHistory.length,
      hasSummary: !!promptContext.summary,
    },
  })

  // Health score: mensagem inbound do contato é um sinal de recência forte.
  // Atualização não-fatal — falha não derruba o fluxo do agente.
  if (conversation.contactId) {
    try {
      await db.contact.update({
        where: { id: conversation.contactId },
        data: { lastInteractionAt: new Date() },
      })
    } catch (error) {
      logger.warn('Failed to update contact.lastInteractionAt', {
        conversationId: ctx.conversationId,
        contactId: conversation.contactId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Emite thinking após carregar contexto — UI mostra que o agente está processando
  await emitAgentStatus({
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
    state: 'thinking',
    agentName: promptContext.agentName,
  })

  // Adiciona tags ricas ao array acumulado — ctx.traceTags é passado para
  // finalizeTrace e para todos os updateActiveTrace subsequentes, garantindo
  // que Langfuse sempre receba o conjunto completo mesmo se fizer replace.
  ctx.traceTags.push(
    `model:${promptContext.modelId}`,
    `step:${promptContext.currentStepOrder + 1}-of-${promptContext.totalSteps || 1}`,
    promptContext.hasSteps ? 'has-steps' : 'no-steps',
    promptContext.hasKnowledgeBase ? 'has-kb' : 'no-kb',
    promptContext.hasActiveProducts ? 'has-products' : 'no-products',
  )

  updateActiveTrace({
    sessionId: ctx.conversationId,
    userId: ctx.organizationId,
    tags: ctx.traceTags,
    metadata: {
      agentId: ctx.effectiveAgentId,
      agentName: promptContext.agentName,
      agentVersion: 'single-v2',
      deployVersion: DEPLOY_VERSION,
      contactName: promptContext.contactName,
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      model: promptContext.modelId,
      messageType: ctx.message.type,
      currentStepOrder: promptContext.currentStepOrder,
      totalSteps: promptContext.totalSteps,
      toolsEnabled: promptContext.toolsEnabled,
      globalToolsCount: promptContext.globalTools?.length ?? 0,
      hasSteps: promptContext.hasSteps,
      hasKnowledgeBase: promptContext.hasKnowledgeBase,
      hasActiveProducts: promptContext.hasActiveProducts,
    },
  })

  // -----------------------------------------------------------------------
  // 4a. Build LLM messages (prompt dinâmico + summary + history)
  // -----------------------------------------------------------------------
  const llmMessages = buildLlmMessages(
    promptContext.systemPrompt,
    promptContext.summary,
    messageHistory,
  )

  // -----------------------------------------------------------------------
  // 4b. Optimistic credit debit (antes do LLM para evitar race condition)
  // Estima input tokens com o conteúdo REAL (system + summary + history)
  // -----------------------------------------------------------------------
  const estimatedInputTokens = Math.ceil(
    llmMessages.reduce((sum, msg) => sum + msg.content.length, 0) / 4,
  )
  const estimatedCost = estimateMaxCost(
    promptContext.modelId,
    estimatedInputTokens,
    MAX_OUTPUT_TOKENS,
  )

  const optimisticDebited = await debitCredits(
    ctx.organizationId,
    estimatedCost,
    'Débito otimista — agente IA',
    {
      agentId: ctx.effectiveAgentId,
      conversationId: ctx.conversationId,
      model: promptContext.modelId,
      estimatedInputTokens,
      estimatedCost,
      type: 'optimistic',
    },
  )

  if (!optimisticDebited) {
    ctx.log('step:4b optimistic_debit', 'EXIT', {
      reason: 'no_credits',
      estimatedCost,
      estimatedInputTokens,
    })
    await createConversationEvent({
      conversationId: ctx.conversationId,
      type: 'PROCESSING_ERROR',
      content: 'Créditos de IA insuficientes para processar esta mensagem.',
      metadata: {
        subtype: 'NO_CREDITS' satisfies ProcessingErrorSubtype,
        estimatedCost,
      },
    })

    await notifyNoCredits({ organizationId: ctx.organizationId, estimatedCost })

    ctx.tracker.addStep({
      type: 'CREDIT_CHECK',
      status: 'FAILED',
      output: { reason: 'no_credits', estimatedCost },
    })
    await revalidateConversationCache(ctx.conversationId, ctx.organizationId)
    ctx.finalizeTrace('no_credits', { metadata: { estimatedCost } })
    await ctx.tracker.skip('no_credits')
    await emitAgentStatus({
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      state: 'idle',
      agentName: 'Agente',
      terminalReason: 'skipped',
    })
    return { skipped: true, reason: 'no_credits' }
  }
  ctx.log('step:4b optimistic_debit', 'PASS', {
    estimatedCost,
    estimatedInputTokens,
  })
  ctx.tracker.addStep({
    type: 'CREDIT_CHECK',
    status: 'PASSED',
    output: { estimatedCost, estimatedInputTokens },
  })

  // -----------------------------------------------------------------------
  // 4c. Build tool set (filtrado pelo toolsEnabled do agent)
  // -----------------------------------------------------------------------
  let handOffCalledByAgentThisRun = false

  const toolContext: ToolContext = {
    organizationId: ctx.organizationId,
    agentId: ctx.effectiveAgentId,
    agentName: promptContext.agentName,
    conversationId: ctx.conversationId,
    contactId: conversation.contactId,
    dealId: conversation.dealId,
    pipelineIds: promptContext.pipelineIds,
    remoteJid: ctx.message.remoteJid,
    inboxProvider: conversation.inbox ?? null,
    onHandOffTransfer: () => { handOffCalledByAgentThisRun = true },
  }

  const effectiveToolsEnabled = promptContext.toolsEnabled

  // Montar config do grupo para a tool transfer_to_agent
  const groupToolConfig: GroupToolConfig | undefined =
    ctx.groupPromptContext && ctx.groupPromptContext.workers.length > 1
      ? {
          groupId: ctx.groupPromptContext.groupId,
          workers: ctx.groupPromptContext.workers,
        }
      : undefined

  const tools = buildToolSet(
    effectiveToolsEnabled,
    toolContext,
    promptContext.allStepActions,
    'globalTools' in promptContext ? promptContext.globalTools : [],
    {
      hasActiveProducts: promptContext.hasActiveProducts,
      hasActiveProductsWithMedia: promptContext.hasActiveProductsWithMedia,
      hasActiveServicesWithProfessionals:
        promptContext.hasActiveServicesWithProfessionals,
      hasKnowledgeBase: promptContext.hasKnowledgeBase,
      agentMode: promptContext.agentMode,
    },
    groupToolConfig,
    /* omitLegacyMediaTools */ useOverhaul,
    /* omitDeterministicStepTools */ useOverhaul,
  )

  // -----------------------------------------------------------------------
  // 5. Typing presence — "digitando..." antes do LLM
  // Meta Cloud API nao suporta composing para business — apenas Evolution
  // -----------------------------------------------------------------------
  if (ctx.message.provider === 'evolution') {
    const presenceCredentials = await resolveEvolutionCredentialsByInstanceName(
      ctx.message.instanceName,
    )
    await sendPresence(
      ctx.message.instanceName,
      ctx.message.remoteJid,
      'composing',
      presenceCredentials,
    )
  }

  // -----------------------------------------------------------------------
  // 6. Call LLM (com logging de duração)
  // -----------------------------------------------------------------------
  ctx.log('step:5 llm_call', 'PASS', {
    model: promptContext.modelId,
    messageCount: llmMessages.length,
    toolCount: Object.keys(tools ?? {}).length,
  })

  // Emite thinking imediatamente antes do LLM — refresh do estado caso o debounce
  // tenha demorado e o client precise do sinal novamente
  await emitAgentStatus({
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
    state: 'thinking',
    agentName: promptContext.agentName,
  })

  const llmStartMs = Date.now()

  // Agentes sem steps não precisam de classificação de etapa no Call 2
  const hasSteps = promptContext.totalSteps > 0

  // Call 1: tools apenas — combinar tools+Output.object na mesma chamada pode travar o modelo (ver PLAN-agent-loop-fix).
  // A diretiva é anexada só ao system prompt da Call 1; llmMessages original fica intacto para o Responder (Call 2).
  const call1Messages = llmMessages.map((message, index) =>
    index === 0 && message.role === 'system'
      ? { ...message, content: promptContext.systemPromptForCall1 + CALL1_EXECUTION_DIRECTIVE }
      : message,
  )

  const result = await generateText({
    model: getModel(promptContext.modelId),
    messages: call1Messages,
    tools,
    temperature: LLM_TEMPERATURE,
    stopWhen: stepCountIs(4),
    maxOutputTokens: MAX_OUTPUT_TOKENS,

    // Barreira estrutural contra tool-call loops — idêntico a tool-agent.ts:166-191.
    prepareStep: async ({ steps }) => {
      if (!tools) return {}

      const executedIdempotent = new Set<string>()
      for (const step of steps) {
        for (const toolResult of step.toolResults ?? []) {
          const toolName = toolResult.toolName
          if (!IDEMPOTENT_TOOL_NAMES.includes(toolName as never)) continue

          const output = toolResult.output as unknown
          const didSucceed =
            typeof output !== 'object' ||
            output === null ||
            (output as Record<string, unknown>).success !== false
          if (didSucceed) executedIdempotent.add(toolName)
        }
      }

      if (executedIdempotent.size === 0) return {}

      const activeTools = Object.keys(tools).filter(
        (name) => !executedIdempotent.has(name),
      ) as Array<keyof typeof tools>

      return { activeTools }
    },

    experimental_telemetry: {
      isEnabled: true,
      tracer: langfuseTracer,
      functionId: 'chat-completion',
      metadata: {
        agentId: ctx.effectiveAgentId,
        agentVersion: 'single-v2',
        conversationId: ctx.conversationId,
        organizationId: ctx.organizationId,
        model: promptContext.modelId,
        contactName: promptContext.contactName,
        deployVersion: DEPLOY_VERSION,
      },
    },
  }).catch(async (llmError: unknown) => {
    // LLM falhou — devolver créditos do débito otimista
    // NÃO cria PROCESSING_ERROR aqui: o Trigger.dev pode fazer retry e o evento
    // ficaria "órfão" se o retry tiver sucesso. O evento é criado no onFailure
    // (só executa quando TODOS os retries falharam).
    ctx.log('step:5 llm_call', 'EXIT', {
      reason: 'llm_error',
      error: llmError instanceof Error ? llmError.message : String(llmError),
    })
    ctx.tracker.addStep({
      type: 'LLM_CALL',
      status: 'FAILED',
      output: {
        reason: 'llm_error',
        error: llmError instanceof Error ? llmError.message : String(llmError),
      },
    })
    await settleCredits({
      organizationId: ctx.organizationId,
      estimatedCost,
      modelId: promptContext.modelId,
      actualUsage: null,
      reason: 'llm_error',
      metadata: {
        agentId: ctx.effectiveAgentId,
        conversationId: ctx.conversationId,
      },
    }).catch((refundError) => {
      logger.error('Failed to settle credits after LLM error', {
        ...ctx.baseLogContext,
        refundError,
      })
    })
    throw llmError
  })

  const llmDurationMs = Date.now() - llmStartMs

  // result.text descartado — alguns modelos vazam "thinking" como texto; responseText vem do Call 2.

  // Filtra apenas mensagens user/assistant para o classificador — sem system prompt do agente
  // e sem tool messages, que o classificador não precisa ver.
  const recentHistory = llmMessages
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .slice(-CLASSIFIER_HISTORY_TURNS) as Array<{
    role: 'user' | 'assistant'
    content: string
  }>

  const stepIds = hasSteps
    ? (promptContext.steps.map((step) => step.id) as [string, ...string[]])
    : null

  // Call 2: Responder + tool_only_fallback embutido. Aguarda antes de iniciar Call 3.
  const responderOutput = await runResponder({
    toolCallSteps: result.steps,
    toolCallResponseMessages: result.response.messages,
    llmMessages,
    hasSteps,
    stepIds,
    modelId: promptContext.modelId,
    agentId: ctx.effectiveAgentId,
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
  })

  let responseText = responderOutput.message
  const responderErrorMsg = responderOutput.responderError
  const fallbackErrorMsg = responderOutput.fallbackError
  const lastResortErrorMsg = responderOutput.lastResortError
  // classifiedId do fallback — sobrescrito pelo Call 3 se bem-sucedido
  let classifiedId: string | undefined = responderOutput.fallbackClassifiedId
  // classifierErrorMsg — preenchida após await classifierPromise; undefined no empty_response path
  let classifierErrorMsg: string | undefined

  if (responderOutput.usedLastResortFallback) {
    ctx.traceTags.push('last_resort_fallback')
    triggerMetadata.set('lastResortFallbackTriggered', true)
    if (responseText) {
      ctx.log('step:5b last_resort_fallback', 'PASS', {
        responseLength: responseText.length,
      })
      ctx.tracker.addStep({
        type: 'FALLBACK_LLM_CALL',
        status: 'PASSED',
        output: { responseLength: responseText.length, reason: 'last_resort_fallback' },
      })
    } else {
      ctx.log('step:5b last_resort_fallback', 'FAIL', {
        responderError: responderOutput.responderError,
        lastResortError: responderOutput.lastResortError,
      })
      ctx.tracker.addStep({
        type: 'FALLBACK_LLM_CALL',
        status: 'FAILED',
        output: {
          reason: 'last_resort_fallback',
          ...(responderOutput.lastResortError && { lastResortError: responderOutput.lastResortError }),
        },
      })
    }
  } else if (responderOutput.usedFallback) {
    ctx.traceTags.push('fallback')
    if (responseText) {
      ctx.log('step:5b tool_only_fallback', 'PASS', {
        responseLength: responseText.length,
      })
      ctx.tracker.addStep({
        type: 'FALLBACK_LLM_CALL',
        status: 'PASSED',
        output: { responseLength: responseText.length },
      })
    }
  }
  // Tag independente do fallback — Call 2 pode falhar mesmo com fallback acionado
  if (responderErrorMsg) {
    ctx.traceTags.push('responder_failed')
  }

  // Tokens de Call 1 + Call 2 para accounting de créditos no caminho crítico.
  // Call 3 (classificador) roda em paralelo ao guard+send — custo negligível
  // (~64 tokens out) é somado ao totalUsage após o send, antes do step advance.
  let totalUsage = {
    inputTokens: (result.usage?.inputTokens ?? 0) + responderOutput.usage.inputTokens,
    outputTokens: (result.usage?.outputTokens ?? 0) + responderOutput.usage.outputTokens,
  }

  // Strip tool calls vazados como texto puro pelo LLM (ex: Gemini)
  // Deve rodar ANTES da checagem de vazio para que, se tudo era tool JSON,
  // o fluxo de "sem resposta" seja acionado corretamente.
  if (responseText) {
    const sanitized = stripLeakedToolCalls(responseText)
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (sanitized.length !== responseText.length) {
      ctx.traceTags.push('leaked_tools_stripped')
      ctx.log('step:5c sanitize_leaked_tools', 'PASS', {
        originalLength: responseText.length,
        sanitizedLength: sanitized.length,
        strippedChars: responseText.length - sanitized.length,
      })
    }

    responseText = sanitized || ''
  }

  // -----------------------------------------------------------------------
  // 5d. Guard + Fallback pipeline (Fase 3 — atrás da flag SINGLE_V2_OVERHAUL)
  //     Só executa quando há texto para validar; empty_response é tratado abaixo.
  // -----------------------------------------------------------------------

  // pendingHumanHandoff é preenchido no degraded path e disparado DEPOIS do send
  // para evitar que aiPaused=true bloqueie o envio ao cliente
  let pendingHumanHandoff: PendingHumanHandoff | null = null

  if (useOverhaul && responseText) {
    const guardResult = await applyGuardPipeline({
      responseText,
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      modelId: promptContext.modelId,
      agentName: promptContext.agentName,
      steps: result.steps ?? [],
      llmMessages,
      traceTags: ctx.traceTags,
    })
    responseText = guardResult.responseText
    pendingHumanHandoff = guardResult.pendingHumanHandoff
  }

  if (!responseText) {
    // Genuinamente sem resposta (sem tool calls ou fallback falhou)
    const hadToolCalls =
      result.steps?.some(
        (step) => step.toolCalls && step.toolCalls.length > 0,
      ) ?? false
    const emptyUsage = {
      inputTokens: totalUsage.inputTokens,
      outputTokens: totalUsage.outputTokens,
    }
    const { actualCost: emptyActualCost } = await settleCredits({
      organizationId: ctx.organizationId,
      estimatedCost,
      modelId: promptContext.modelId,
      actualUsage: emptyUsage,
      reason: 'empty_response',
      metadata: {
        agentId: ctx.effectiveAgentId,
        conversationId: ctx.conversationId,
      },
    })
    // Plataforma: evento genérico EMPTY_RESPONSE sempre criado (compatibilidade)
    await createConversationEvent({
      conversationId: ctx.conversationId,
      type: 'INFO',
      content: 'A IA não gerou uma resposta para esta mensagem.',
      metadata: { subtype: 'EMPTY_RESPONSE' satisfies InfoSubtype },
    })
    // Plataforma: se houve falha explícita de LLM, cria evento PROCESSING_ERROR visível ao operador
    if (responderErrorMsg || fallbackErrorMsg || lastResortErrorMsg) {
      await createConversationEvent({
        conversationId: ctx.conversationId,
        type: 'PROCESSING_ERROR',
        content:
          'Falha ao gerar resposta — Responder e fallback retornaram erro.',
        visibleToUser: false,
        metadata: {
          subtype: 'LLM_ERROR' satisfies ProcessingErrorSubtype,
          ...(responderErrorMsg && { responderError: responderErrorMsg }),
          ...(fallbackErrorMsg && { fallbackError: fallbackErrorMsg }),
          ...(lastResortErrorMsg && { lastResortError: lastResortErrorMsg }),
          ...(classifierErrorMsg && { classifierError: classifierErrorMsg }),
        },
      })
    }
    await revalidateConversationCache(ctx.conversationId, ctx.organizationId)
    ctx.traceTags.push('empty_response')
    triggerMetadata.set('model', promptContext.modelId)
    // Trigger.dev: set na run metadata para visibilidade no painel sem precisar baixar log
    if (responderErrorMsg)
      triggerMetadata.set('responderError', responderErrorMsg)
    if (fallbackErrorMsg) triggerMetadata.set('fallbackError', fallbackErrorMsg)
    if (lastResortErrorMsg)
      triggerMetadata.set('lastResortError', lastResortErrorMsg)
    if (classifierErrorMsg)
      triggerMetadata.set('classifierError', classifierErrorMsg)
    // Langfuse: inclui mensagens de erro na metadata do trace para diagnóstico sem download
    ctx.finalizeTrace('empty_response', {
      metadata: {
        finishReason: result.finishReason,
        creditsCost: emptyActualCost,
        resultTextLength: result.text?.length ?? 0,
        responderMessageLength: responseText.length,
        ...(responderErrorMsg && { responderError: responderErrorMsg }),
        ...(fallbackErrorMsg && { fallbackError: fallbackErrorMsg }),
        ...(lastResortErrorMsg && { lastResortError: lastResortErrorMsg }),
        ...(classifierErrorMsg && { classifierError: classifierErrorMsg }),
      },
    })
    ctx.log('step:5 llm_call', 'EXIT', {
      reason: 'empty_response',
      llmDurationMs,
      actualCost: emptyActualCost,
      finishReason: result.finishReason,
      outputTokens: totalUsage.outputTokens,
      stepsCount: result.steps?.length ?? 0,
      resultTextLength: result.text?.length ?? 0,
      responderMessageLength: responseText.length,
    })
    // Trigger.dev: erros de LLM visíveis no step output da UI (sem precisar baixar log)
    ctx.tracker.addStep({
      type: 'LLM_CALL',
      status: 'FAILED',
      durationMs: llmDurationMs,
      output: {
        reason: 'empty_response',
        resultText: result.text ?? null,
        resultTextLength: result.text?.length ?? 0,
        responderMessageLength: responseText.length,
        finishReason: result.finishReason,
        outputTokens: totalUsage.outputTokens,
        inputTokens: totalUsage.inputTokens,
        stepsCount: result.steps?.length ?? 0,
        toolCalls:
          result.steps?.flatMap(
            (step) => step.toolCalls?.map((tc) => tc.toolName) ?? [],
          ) ?? [],
        fallbackAttempted: hadToolCalls,
        ...(responderErrorMsg && { responderError: responderErrorMsg }),
        ...(fallbackErrorMsg && { fallbackError: fallbackErrorMsg }),
        ...(lastResortErrorMsg && { lastResortError: lastResortErrorMsg }),
        ...(classifierErrorMsg && { classifierError: classifierErrorMsg }),
      },
    })
    await ctx.tracker.skip({
      reason: 'empty_response',
      modelId: promptContext.modelId,
      inputTokens: totalUsage.inputTokens,
      outputTokens: totalUsage.outputTokens,
      creditsCost: emptyActualCost,
      finishReason: result.finishReason,
      metadata: {
        resultText: result.text ?? null,
        stepsCount: result.steps?.length ?? 0,
        fallbackAttempted: hadToolCalls,
        ...(responderErrorMsg && { responderError: responderErrorMsg }),
        ...(fallbackErrorMsg && { fallbackError: fallbackErrorMsg }),
        ...(classifierErrorMsg && { classifierError: classifierErrorMsg }),
      },
    })
    await emitAgentStatus({
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      state: 'idle',
      agentName: promptContext.agentName,
      terminalReason: 'skipped',
    })
    return { skipped: true, reason: 'empty_response' }
  }

  ctx.log('step:5 llm_response', 'PASS', {
    llmDurationMs,
    inputTokens: totalUsage.inputTokens,
    outputTokens: totalUsage.outputTokens,
    steps: result.steps?.length ?? 1,
    toolCalls:
      result.steps?.flatMap(
        (step) => step.toolCalls?.map((toolCall) => toolCall.toolName) ?? [],
      ) ?? [],
  })
  ctx.tracker.addStep({
    type: 'LLM_CALL',
    status: 'PASSED',
    durationMs: llmDurationMs,
    output: {
      inputTokens: totalUsage.inputTokens,
      outputTokens: totalUsage.outputTokens,
    },
  })

  // Registrar tool calls individuais como steps
  for (const aiStep of result.steps ?? []) {
    for (const toolCall of aiStep.toolCalls ?? []) {
      const toolResult = aiStep.toolResults?.find(
        (result) => result.toolName === toolCall.toolName,
      )
      const toolOutput = toolResult?.output as { success?: boolean } | undefined
      const isToolSuccess = toolOutput?.success !== false
      ctx.tracker.addStep({
        type: 'TOOL_CALL',
        status: isToolSuccess ? 'PASSED' : 'FAILED',
        toolName: toolCall.toolName,
        input: toolCall.input as Record<string, unknown>,
        output: toolResult?.output as Record<string, unknown> | undefined,
      })
    }
  }

  // Create tool events from LLM steps
  if (result.steps?.length) {
    const usedToolNames = result.steps.flatMap(
      (step) => step.toolCalls?.map((tc) => tc.toolName) ?? [],
    )
    if (usedToolNames.length > 0) {
      ctx.traceTags.push('tool_calls')
      // MVP: emite running_tool com o último tool chamado no turno
      const lastToolName = usedToolNames[usedToolNames.length - 1]
      await emitAgentStatus({
        conversationId: ctx.conversationId,
        organizationId: ctx.organizationId,
        state: 'running_tool',
        agentName: promptContext.agentName,
        toolName: lastToolName,
      })
    }
  }

  // Emite composing antes de persistir/enviar a resposta
  await emitAgentStatus({
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
    state: 'composing',
    agentName: promptContext.agentName,
  })

  // -----------------------------------------------------------------------
  // 7. Double-check anti-atropelamento — re-query aiPaused
  //    Pula se o próprio agente disparou hand_off_to_human nesta execução,
  //    caso contrário a resposta final nunca seria enviada ao lead.
  //
  //    Usa DUAS fontes de detecção para cobrir o caso de fallback (NoOutputGeneratedError /
  //    NoObjectGeneratedError) onde result.steps fica [] e não reflete as tool calls reais:
  //    1. handOffCalledByAgentThisRun: closure setado dentro do execute da tool (mais confiável)
  //    2. result.steps: fonte secundária para o caminho normal (sem fallback)
  // -----------------------------------------------------------------------
  const agentTriggeredHandOff =
    handOffCalledByAgentThisRun ||
    result.steps?.some((aiStep) =>
      aiStep.toolCalls?.some(
        (toolCall) => toolCall.toolName === 'hand_off_to_human',
      ),
    )

  const freshConversation = agentTriggeredHandOff
    ? null
    : await db.conversation.findUnique({
        where: { id: ctx.conversationId },
        select: { aiPaused: true },
      })

  if (freshConversation?.aiPaused) {
    // Salva resposta no banco mas NÃO envia no WhatsApp
    await db.message.create({
      data: {
        conversationId: ctx.conversationId,
        role: 'assistant',
        content: responseText,
        inputTokens: totalUsage.inputTokens ?? null,
        outputTokens: totalUsage.outputTokens ?? null,
        metadata: {
          model: promptContext.modelId,
          skippedReason: 'ai_paused_during_generation',
          llmDurationMs,
        },
      },
    })

    const { actualCost: pausedActualCost } = await settleCredits({
      organizationId: ctx.organizationId,
      estimatedCost,
      modelId: promptContext.modelId,
      actualUsage: {
        inputTokens: totalUsage.inputTokens,
        outputTokens: totalUsage.outputTokens,
      },
      reason: 'ai_paused_during_generation',
      metadata: {
        agentId: ctx.effectiveAgentId,
        conversationId: ctx.conversationId,
      },
    })

    await createConversationEvent({
      conversationId: ctx.conversationId,
      type: 'INFO',
      content:
        'IA foi pausada durante geração. Resposta salva mas não enviada.',
      metadata: {
        subtype: 'AI_PAUSED_DURING_GENERATION' satisfies InfoSubtype,
      },
    })
    await revalidateConversationCache(ctx.conversationId, ctx.organizationId)
    ctx.log('step:6 pause_recheck', 'EXIT', {
      reason: 'ai_paused_during_generation',
      llmDurationMs,
    })
    ctx.tracker.addStep({
      type: 'PAUSE_CHECK',
      status: 'SKIPPED',
      output: { reason: 'ai_paused_during_generation' },
    })
    ctx.finalizeTrace('ai_paused_during_generation', {
      metadata: { creditsCost: pausedActualCost },
    })
    await ctx.tracker.skip({
      reason: 'ai_paused_during_generation',
      modelId: promptContext.modelId,
      inputTokens: totalUsage.inputTokens,
      outputTokens: totalUsage.outputTokens,
      creditsCost: pausedActualCost,
      finishReason: result.finishReason,
    })
    await emitAgentStatus({
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      state: 'idle',
      agentName: promptContext.agentName,
      terminalReason: 'skipped',
    })
    return { skipped: true, reason: 'ai_paused_during_generation' }
  }
  ctx.log('step:6 pause_recheck', 'PASS')
  ctx.tracker.addStep({ type: 'PAUSE_CHECK', status: 'PASSED' })

  // -----------------------------------------------------------------------
  // 7. Preparar texto — salvar no banco ocorre após confirmação do envio
  // -----------------------------------------------------------------------
  const textToSend = prefixAttendantName(
    responseText,
    promptContext.agentName,
    conversation.inbox?.showAttendantName ?? false,
  )

  ctx.log('step:7 response_prepared', 'PASS')

  // -----------------------------------------------------------------------
  // 8. Ajuste de créditos (refund se custo real < estimado, debit extra se >)
  // -----------------------------------------------------------------------
  const totalTokens = totalUsage.inputTokens + totalUsage.outputTokens
  const { actualCost, type: creditAdjType } = await settleCredits({
    organizationId: ctx.organizationId,
    estimatedCost,
    modelId: promptContext.modelId,
    actualUsage: {
      inputTokens: totalUsage.inputTokens,
      outputTokens: totalUsage.outputTokens,
    },
    reason: 'completed',
    metadata: {
      agentId: ctx.effectiveAgentId,
      conversationId: ctx.conversationId,
      totalTokens,
    },
  })
  ctx.log('step:8 credit_adjustment', 'PASS', {
    type: creditAdjType,
    estimatedCost,
    actualCost,
    totalTokens,
  })

  // -----------------------------------------------------------------------
  // 9. Send WhatsApp message + salvar resultado (sent ou failed) no banco
  // Delegado ao helper sendOutboundMessage que centraliza routing e dedup
  // -----------------------------------------------------------------------
  ctx.log('step:9 whatsapp_sending', 'PASS', {
    provider: ctx.message.provider,
    textLength: textToSend.length,
  })

  if (!conversation.inbox) {
    throw new Error(`Inbox not found for conversation: ${ctx.conversationId}`)
  }

  // retry.fetch do Trigger.dev: retenta 429/5xx no nível HTTP sem re-executar o pipeline
  const fetcher = createRetryableFetch()

  // Call 3 dispara aqui — guard aprovou, mensagem será enviada.
  // Roda em paralelo ao envio WhatsApp para reduzir latência percebida pelo lead.
  // Texto final (pós-strip + pós-guard) garante que não há tokens gastos em vão.
  // Aguardado logo após o send — ver bloco "Aguarda Call 3" abaixo.
  const classifierPromise = hasSteps
    ? runStepClassifier({
        steps: promptContext.steps,
        recentHistory,
        contactName: promptContext.contactName,
        agentResponse: responseText || undefined,
        agentId: ctx.effectiveAgentId,
        conversationId: ctx.conversationId,
        organizationId: ctx.organizationId,
        currentStepOrder: promptContext.currentStepOrder,
      })
    : Promise.resolve(null)

  let lastSentId: string | null = null

  try {
    if (useOverhaul) {
      // Fase 4: extrair blocos de mídia inline e enviar separadamente
      const inlineResult = await extractAndSendInlineMedia(textToSend, {
        conversationId: ctx.conversationId,
        organizationId: ctx.organizationId,
        remoteJid: ctx.message.remoteJid,
        inboxProvider: conversation.inbox,
        credentials: conversation.inbox,
        fetcher,
      })

      lastSentId = inlineResult.lastSentId

      logger.info('single-v2 inline media send completed', {
        conversationId: ctx.conversationId,
        blocksSent: inlineResult.blocksSent,
        blocksSkipped: inlineResult.blocksSkipped,
        ssrfBlockedCount: inlineResult.ssrfBlockedUrls.length,
        lastSentId,
      })

      triggerMetadata.set(
        'ssrfBlockedCount',
        inlineResult.ssrfBlockedUrls.length,
      )

      ctx.log('step:9 whatsapp_sent', 'PASS', {
        responseLength: responseText.length,
        blocksSent: inlineResult.blocksSent,
        blocksSkipped: inlineResult.blocksSkipped,
        ssrfBlockedCount: inlineResult.ssrfBlockedUrls.length,
        provider: ctx.message.provider,
      })
      ctx.tracker.addStep({
        type: 'SEND_MESSAGE',
        status: 'PASSED',
        output: {
          responseLength: responseText.length,
          blocksSent: inlineResult.blocksSent,
          blocksSkipped: inlineResult.blocksSkipped,
          provider: ctx.message.provider,
        },
      })
    } else {
      // Path legado (single-v1): mensagem única sem extração de mídia inline
      const { sentIds: sentMessageIds } = await sendOutboundMessage({
        conversationId: ctx.conversationId,
        organizationId: ctx.organizationId,
        credentials: conversation.inbox,
        remoteJid: ctx.message.remoteJid,
        text: textToSend,
        fetcher,
      })

      lastSentId = sentMessageIds.at(-1) ?? null

      ctx.log('step:9 whatsapp_sent', 'PASS', {
        responseLength: responseText.length,
        sentMessageIds,
        provider: ctx.message.provider,
      })
      ctx.tracker.addStep({
        type: 'SEND_MESSAGE',
        status: 'PASSED',
        output: {
          responseLength: responseText.length,
          provider: ctx.message.provider,
        },
      })
    }

    // Sucesso: salvar mensagem com deliveryStatus 'sent'
    await saveAgentResponseSent({
      conversationId: ctx.conversationId,
      textToSend,
      providerMessageId: lastSentId,
      inputTokens: totalUsage.inputTokens ?? null,
      outputTokens: totalUsage.outputTokens ?? null,
      modelId: promptContext.modelId,
      llmDurationMs,
    })

    await revalidateConversationCache(ctx.conversationId, ctx.organizationId)

    // Salvar eventos de tool apenas após envio bem-sucedido
    if (result.steps?.length) {
      await createToolEvents(ctx.conversationId, result.steps)
    }

    ctx.log('step:9 response_saved', 'PASS')
  } catch (sendError) {
    // Envio falhou — salvar mensagem com deliveryStatus 'failed' e abortar
    // sem retry do pipeline (AbortTaskRunError impede retentativas do Trigger.dev)
    const parsedSendError = await saveAgentResponseFailed({
      conversationId: ctx.conversationId,
      textToSend,
      inputTokens: totalUsage.inputTokens ?? null,
      outputTokens: totalUsage.outputTokens ?? null,
      modelId: promptContext.modelId,
      llmDurationMs,
      error: sendError,
    })

    await revalidateConversationCache(ctx.conversationId, ctx.organizationId)

    await createConversationEvent({
      conversationId: ctx.conversationId,
      type: 'PROCESSING_ERROR',
      content: parsedSendError.userMessage ?? 'Falha na entrega da mensagem.',
      metadata: {
        subtype: 'SEND_FAILED' satisfies ProcessingErrorSubtype,
        provider: ctx.message.provider,
      },
    })

    ctx.log('step:9 whatsapp_send_failed', 'EXIT', {
      provider: ctx.message.provider,
      error: sendError instanceof Error ? sendError.message : String(sendError),
    })
    ctx.tracker.addStep({
      type: 'SEND_MESSAGE',
      status: 'FAILED',
      output: {
        provider: ctx.message.provider,
        error:
          sendError instanceof Error ? sendError.message : String(sendError),
      },
    })

    await emitAgentStatus({
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      state: 'idle',
      agentName: promptContext.agentName,
      terminalReason: 'failed',
    })

    throw new AbortTaskRunError(
      `Send failed (${ctx.message.provider}): ${sendError instanceof Error ? sendError.message : String(sendError)}`,
    )
  }

  // -----------------------------------------------------------------------
  // Aguarda Call 3 — rodou em paralelo ao guard+send para reduzir latência
  // percebida pelo lead. Resolve aqui, antes do step advance.
  // -----------------------------------------------------------------------
  const classifier = await classifierPromise
  // Classifier tem prioridade sobre classifiedId do tool_only_fallback.
  if (classifier?.classifiedId) {
    classifiedId = classifier.classifiedId
  }
  classifierErrorMsg = classifier?.error
  if (classifierErrorMsg) ctx.traceTags.push('step_classifier_failed')

  // Agrega tokens do classificador ao totalUsage para logging final.
  const classifierUsage = classifier?.usage ?? { inputTokens: 0, outputTokens: 0 }
  totalUsage = {
    inputTokens: totalUsage.inputTokens + classifierUsage.inputTokens,
    outputTokens: totalUsage.outputTokens + classifierUsage.outputTokens,
  }

  // -----------------------------------------------------------------------
  // 10a-guard. Handoff humano pendente do degraded path do guard
  // Chamado DEPOIS do send para evitar que aiPaused=true bloqueie o envio
  // -----------------------------------------------------------------------
  if (pendingHumanHandoff) {
    await triggerHumanHandoff(pendingHumanHandoff).catch((handoffError) => {
      logger.error('single-guard: triggerHumanHandoff failed', {
        conversationId: ctx.conversationId,
        error:
          handoffError instanceof Error
            ? handoffError.message
            : String(handoffError),
      })
    })
  }

  // -----------------------------------------------------------------------
  // 10b. Step advance + lifecycle + auto-ações + follow-up
  // Non-fatal individualmente — falhas logadas sem bloquear o fluxo.
  // -----------------------------------------------------------------------
  const stepAdvanceResult = await applyStepAdvance({
    classifiedId,
    currentStepOrder: promptContext.currentStepOrder,
    totalSteps: promptContext.totalSteps,
    steps: promptContext.steps,
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
    agentId: ctx.effectiveAgentId,
    agentName: promptContext.agentName,
    contactId: promptContext.conversationContactId ?? null,
    dealId: conversation.dealId,
    isV2: useOverhaul,
  })

  const { newStepOrder, stepAdvanced, followUpScheduled, followUpFirstDelayMinutes, totalFollowUps } =
    stepAdvanceResult

  if (stepAdvanced) {
    ctx.log('step:10a step_advanced', 'PASS', {
      previousStep: promptContext.currentStepOrder,
      newStep: newStepOrder,
      classifiedId,
    })
  }

  if (followUpScheduled && followUpFirstDelayMinutes !== undefined) {
    ctx.log('step:10b follow_up_scheduled', 'PASS', {
      totalFollowUps,
      firstDelayMinutes: followUpFirstDelayMinutes,
    })
    ctx.tracker.addStep({
      type: 'FOLLOW_UP_SCHEDULE',
      status: 'PASSED',
      output: { totalFollowUps, firstDelayMinutes: followUpFirstDelayMinutes },
    })
  } else {
    ctx.log('step:10b follow_up_scheduled', 'SKIP', {
      reason: 'no_follow_ups_for_step',
    })
    ctx.tracker.addStep({
      type: 'FOLLOW_UP_SCHEDULE',
      status: 'SKIPPED',
      output: { reason: 'no_follow_ups_for_step' },
    })
  }

  // -----------------------------------------------------------------------
  // 11. Memory compression — se >= threshold msgs, summarizar e arquivar
  // -----------------------------------------------------------------------
  const memoryResult = await compressMemory({
    conversationId: ctx.conversationId,
  })
  ctx.tracker.addStep({
    type: 'MEMORY_COMPRESSION',
    status: memoryResult.compressed ? 'PASSED' : 'SKIPPED',
    output: memoryResult.compressed
      ? { compressed: true, archivedCount: memoryResult.archivedCount }
      : { reason: memoryResult.reason ?? 'below_threshold' },
  })

  // -----------------------------------------------------------------------
  // 10. Logging final
  // -----------------------------------------------------------------------
  const totalDurationMs = Date.now() - ctx.taskStartMs

  triggerMetadata.set('model', promptContext.modelId)
  triggerMetadata.set('stepAdvanced', stepAdvanced)
  triggerMetadata.set('newStepOrder', newStepOrder)
  ctx.finalizeTrace('completed', {
    metadata: {
      responseLength: responseText.length,
      finishReason: result.finishReason,
      creditsCost: actualCost,
      totalDurationMs,
      inputTokens: totalUsage.inputTokens,
      outputTokens: totalUsage.outputTokens,
    },
  })

  ctx.log('step:10 completed', 'PASS', {
    inputTokens: totalUsage.inputTokens,
    outputTokens: totalUsage.outputTokens,
    llmDurationMs,
    totalDurationMs,
  })

  // Persistir execução completa em batch — falha non-fatal (try/catch interno)
  await ctx.tracker.complete({
    modelId: promptContext.modelId,
    inputTokens: totalUsage.inputTokens,
    outputTokens: totalUsage.outputTokens,
    creditsCost: actualCost,
    finishReason: result.finishReason,
  })

  await emitAgentStatus({
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
    state: 'idle',
    agentName: promptContext.agentName,
    terminalReason: 'completed',
  })

  return { success: true }
}

// ---------------------------------------------------------------------------
// Task Trigger.dev — registra esta pipeline como task independente
// ---------------------------------------------------------------------------

export const processAgentMessageSingleV2 = task({
  id: 'process-agent-message-single-v2',
  retry: { maxAttempts: 3 },
  run: async (payload: ProcessAgentMessagePayload, { ctx: triggerCtx }) => {
    return observe(
      async () => {
        const dispatchResult = await buildDispatcherCtx(payload, triggerCtx)
        try {
          if ('skipped' in dispatchResult) return dispatchResult
          return await runSingleV2(dispatchResult.ctx)
        } finally {
          // Emite idle com failed antes do flushLangfuse — idempotente se completed já foi emitido
          if (!('skipped' in dispatchResult)) {
            await emitAgentStatus({
              conversationId: dispatchResult.ctx.conversationId,
              organizationId: dispatchResult.ctx.organizationId,
              state: 'idle',
              agentName: 'Agente',
              terminalReason: 'failed',
            })
          }
          await flushLangfuse()
        }
      },
      { name: 'process-agent-message-single-v2' },
    )()
  },
  onFailure: async ({ payload, error }) =>
    handleAgentTaskFailure('process-agent-message-single-v2', {
      payload,
      error,
    }),
})

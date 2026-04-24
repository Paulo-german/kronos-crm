import { task, logger, metadata as triggerMetadata } from '@trigger.dev/sdk/v3'
import { observe, updateActiveTrace } from '@langfuse/tracing'
import { flushLangfuse, langfuseTracer } from './lib/langfuse'
import { buildDispatcherCtx } from './lib/build-dispatcher-ctx'
import type { ProcessAgentMessagePayload } from './lib/build-dispatcher-ctx'
import { handleAgentTaskFailure } from './lib/handle-task-failure'
import { generateText, generateObject, stepCountIs } from 'ai'
import { z } from 'zod'
import { getModel } from '@/_lib/ai/provider'
import { db } from '@/_lib/prisma'
import { estimateMaxCost } from '@/_lib/ai/pricing'
import { debitCredits } from '@/_lib/billing/credit-utils'
import { settleCredits } from './lib/settle-credits'
import { notifyNoCredits } from './lib/notify-no-credits'
import { sendPresence } from '@/_lib/evolution/send-message'
import { resolveEvolutionCredentialsByInstanceName } from '@/_lib/evolution/resolve-credentials'
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
import { AUTO_REOPEN_FIELDS } from '@/_lib/conversation/auto-reopen'
import { prefixAttendantName } from '@/_lib/inbox/prefix-attendant-name'
import { getFollowUpsForStep } from '@/_data-access/follow-up/get-follow-ups-for-step'
import { revalidateConversationCache } from './lib/revalidate-cache'
import { emitAgentStatus } from './lib/emit-agent-status'
import type { ToolContext } from './tools/types'
import type { DispatcherCtx } from './dispatcher-types'
import { GENERIC_SAFE_FALLBACK } from './lib/two-phase-types'
import { triggerHumanHandoff } from './lib/trigger-human-handoff'
import { runSingleFallback } from './agent/single-fallback'
import { runSingleGuard } from './agent/single-guard'
import { getProductCatalogForGuard } from './lib/product-catalog-cache'

// Limite de mensagens carregadas no histórico para context LLM
const MESSAGE_HISTORY_LIMIT = 50

// Tool names que o LLM pode vazar como texto JSON em vez de usar tool calling estruturado
const KNOWN_TOOL_NAMES = new Set([
  'move_deal',
  'update_contact',
  'update_deal',
  'create_task',
  'search_knowledge',
  'list_availability',
  'create_event',
  'update_event',
  'hand_off_to_human',
  'search_products',
  'send_product_media',
  'send_media',
  'transfer_to_agent',
])

// Idêntico a tool-agent.ts:24-31 — executadas com sucesso uma vez, não devem repetir no mesmo turno.
const IDEMPOTENT_TOOL_NAMES = [
  'update_deal',
  'move_deal',
  'update_contact',
  'update_event',
  'hand_off_to_human',
  'transfer_to_agent',
] as const

/**
 * Strip JSON tool calls que o LLM vazou como texto puro.
 * Alguns modelos (ex: Gemini) geram `{"tool":"update_deal","title":"..."}` inline
 * em vez de usar o mecanismo de tool calling do SDK.
 */
function stripLeakedToolCalls(text: string): string {
  // Padrão 1: JSON com chave "tool"/"function"/"action"/"name" nomeando tool conhecida
  let cleaned = text.replace(
    /\{[^{}]*"(?:tool|function|action)"\s*:\s*"([a-z_]+)"[^{}]*\}/g,
    (match, toolName: string) => {
      if (KNOWN_TOOL_NAMES.has(toolName)) {
        return ''
      }
      return match
    },
  )

  // Padrão 2: blocos markdown (```) contendo JSON de tool call
  cleaned = cleaned.replace(
    /```(?:json)?\s*\n?\{[^`]*"(?:tool|function|action)"\s*:\s*"([a-z_]+)"[^`]*\}[\s\n]*```/g,
    (match, toolName: string) => {
      if (KNOWN_TOOL_NAMES.has(toolName)) {
        return ''
      }
      return match
    },
  )

  return cleaned
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
  const [promptContext, messageHistory, conversation] =
    await Promise.all([
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
        : buildSystemPrompt(ctx.effectiveAgentId, ctx.conversationId, ctx.organizationId, ctx.groupPromptContext),
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
              evolutionInstanceName: true,
              evolutionApiUrl: true,
              evolutionApiKey: true,
              metaPhoneNumberId: true,
              metaAccessToken: true,
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

  // Emite thinking após carregar contexto — UI mostra que o agente está processando
  await emitAgentStatus({
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
    state: 'thinking',
    agentName: promptContext.agentName,
  })

  updateActiveTrace({
    metadata: {
      agentId: ctx.effectiveAgentId,
      contactName: promptContext.contactName,
      model: promptContext.modelId,
      messageType: ctx.message.type,
    },
  })

  // -----------------------------------------------------------------------
  // 4a. Build LLM messages (prompt dinâmico + summary + history)
  // -----------------------------------------------------------------------
  const llmMessages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }> = []

  llmMessages.push({
    role: 'system',
    content: promptContext.systemPrompt,
  })

  if (promptContext.summary) {
    llmMessages.push({
      role: 'system',
      content: `Resumo da conversa anterior:\n${promptContext.summary}`,
    })
  }

  for (const msg of messageHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      let messageContent = msg.content

      // Enriquecer mensagens outbound com transcrição de mídia
      if (msg.role === 'assistant' && msg.metadata) {
        const meta = msg.metadata as Record<string, unknown>
        if (typeof meta.mediaTranscription === 'string' && meta.mediaTranscription.length > 0) {
          const mediaInfo = meta.media as Record<string, unknown> | undefined
          const mimetype = mediaInfo?.mimetype as string | undefined
          const fileName = mediaInfo?.fileName as string | undefined
          const hasCaption = msg.content !== '[Imagem]'
            && msg.content !== '[Vídeo]'
            && !msg.content.startsWith('[Documento:')

          const captionPart = hasCaption
            ? ` com mensagem: "${msg.content}"`
            : ''

          if (mimetype?.startsWith('image/')) {
            messageContent = `[Imagem enviada pelo atendente${captionPart} — conteúdo da imagem: ${meta.mediaTranscription}]`
          } else if (fileName) {
            messageContent = `[Documento "${fileName}" enviado pelo atendente${captionPart} — conteúdo extraído:\n${meta.mediaTranscription}]`
          } else {
            messageContent = `[Mídia enviada pelo atendente${captionPart} — conteúdo: ${meta.mediaTranscription}]`
          }
        }
      }

      llmMessages.push({
        role: msg.role,
        content: messageContent,
      })
    }
  }

  // -----------------------------------------------------------------------
  // 4b. Optimistic credit debit (antes do LLM para evitar race condition)
  // Estima input tokens com o conteúdo REAL (system + summary + history)
  // -----------------------------------------------------------------------
  const MAX_OUTPUT_TOKENS = 3072
  const LLM_TEMPERATURE = 0.4
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
      content:
        'Créditos de IA insuficientes para processar esta mensagem.',
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
    {
      hasActiveProducts: promptContext.hasActiveProducts,
      hasActiveProductsWithMedia: promptContext.hasActiveProductsWithMedia,
      hasKnowledgeBase: promptContext.hasKnowledgeBase,
    },
    groupToolConfig,
    /* omitLegacyMediaTools */ useOverhaul,
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
  const result = await generateText({
    model: getModel(promptContext.modelId),
    messages: llmMessages,
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
        conversationId: ctx.conversationId,
        model: promptContext.modelId,
        contactName: promptContext.contactName,
      },
    },
  }).catch(async (llmError: unknown) => {
    // LLM falhou — devolver créditos do débito otimista
    // NÃO cria PROCESSING_ERROR aqui: o Trigger.dev pode fazer retry e o evento
    // ficaria "órfão" se o retry tiver sucesso. O evento é criado no onFailure
    // (só executa quando TODOS os retries falharam).
    ctx.log('step:5 llm_call', 'EXIT', {
      reason: 'llm_error',
      error:
        llmError instanceof Error ? llmError.message : String(llmError),
    })
    ctx.tracker.addStep({
      type: 'LLM_CALL',
      status: 'FAILED',
      output: {
        reason: 'llm_error',
        error:
          llmError instanceof Error
            ? llmError.message
            : String(llmError),
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
  let responseText = ''

  // Zeros iniciais garantem que totalUsage seja tipado mesmo se Call 2 falhar.
  let responderUsage = { inputTokens: 0, outputTokens: 0 }

  // Call 2: generateObject sem tools — classifica step e gera mensagem sem o bug tools+Output.
  const stepIds = promptContext.steps.map((step) => step.id)
  const responderSchema = hasSteps
    ? z.object({
        message: z
          .string()
          .describe(
            'Sua resposta ao cliente. Texto natural que será enviado diretamente ao lead.',
          ),
        currentStep: z
          .enum(stepIds as [string, ...string[]])
          .nullable()
          .describe(
            'UUID exato da etapa atual, escolhido entre os IDs do Processo de Atendimento. Só avança, nunca retrocede.',
          ),
      })
    : z.object({
        message: z
          .string()
          .describe(
            'Sua resposta ao cliente. Texto natural que será enviado diretamente ao lead.',
          ),
      })

  let classifiedId: string | undefined

  try {
    const responderResult = await generateObject({
      model: getModel(promptContext.modelId),
      // System prompt original + histórico + trajetória do turno (tool-calls/results)
      messages: [
        ...llmMessages,
        ...result.response.messages,
      ],
      schema: responderSchema,
      temperature: LLM_TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      experimental_telemetry: {
        isEnabled: true,
        tracer: langfuseTracer,
        functionId: 'chat-completion-responder',
        metadata: {
          agentId: ctx.effectiveAgentId,
          conversationId: ctx.conversationId,
          model: promptContext.modelId,
          stage: 'responder',
        },
      },
    })

    // [CRÍTICO] Capturar usage do Call 2 para agregação em totalUsage
    responderUsage = {
      inputTokens: responderResult.usage?.inputTokens ?? 0,
      outputTokens: responderResult.usage?.outputTokens ?? 0,
    }

    responseText = responderResult.object.message ?? ''
    classifiedId = hasSteps
      ? (responderResult.object as unknown as { currentStep: string | null }).currentStep ?? undefined
      : undefined
  } catch (responderError) {
    // Falha graceful: deixa responseText vazio → cai no tool_only_fallback
    // (que continua rodando como safety net com generateText sem tools).
    logger.warn('Responder (Call 2) failed — falling back', {
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      error:
        responderError instanceof Error
          ? responderError.message
          : String(responderError),
    })
    ctx.traceTags.push('responder_failed')
  }

  // Agregação de tokens do Call 1 + Call 2 para accounting correto.
  // totalUsage substitui result.usage em TODOS os pontos downstream.
  // Padrão idêntico ao de crew-v1 (trigger/process-agent-message-crew-v1.ts:594-597).
  const totalUsage = {
    inputTokens:
      (result.usage?.inputTokens ?? 0) + responderUsage.inputTokens,
    outputTokens:
      (result.usage?.outputTokens ?? 0) + responderUsage.outputTokens,
  }

  // Guard de monotonicidade: step só avança, nunca regride.
  // O Call 2 retorna o UUID do step — convertemos para `order` via lookup no context.
  // Math.max previne regressão; Math.min previne avanço além do último step.
  const classifiedStep = classifiedId
    ? promptContext.steps.find((step) => step.id === classifiedId)?.order
    : undefined
  const newStepOrder =
    classifiedStep !== undefined
      ? Math.max(
          promptContext.currentStepOrder,
          Math.min(classifiedStep, promptContext.totalSteps - 1),
        )
      : promptContext.currentStepOrder
  const stepAdvanced = newStepOrder > promptContext.currentStepOrder

  // Se o LLM gastou todos os steps em tool calls e não gerou texto,
  // faz uma chamada extra SEM tools para gerar a resposta ao cliente.
  if (!responseText) {
    const hasToolCalls = result.steps?.some(
      (step) => step.toolCalls && step.toolCalls.length > 0,
    )

    if (hasToolCalls) {
      ctx.traceTags.push('fallback')
      ctx.log('step:5b tool_only_fallback', 'PASS', {
        steps: result.steps?.length,
        toolCalls: result.steps?.flatMap(
          (step) => step.toolCalls?.map((tc) => tc.toolName) ?? [],
        ),
      })

      // Incluir a trajetória do turno (tool-calls + tool-results do Call 1) para que
      // o modelo de fallback saiba o que as tools fizeram e possa descrevê-lo ao cliente.
      // Sem result.response.messages o fallback gerava resposta sem contexto das ações.
      const fallbackMessages = [
        ...llmMessages,
        ...result.response.messages,
        {
          role: 'system' as const,
          content:
            'Você acabou de executar ações (tool calls) para o cliente, mas não gerou uma resposta textual. ' +
            'Agora responda ao cliente de forma natural, informando o que foi feito. ' +
            'Seja breve e objetivo.',
        },
      ]

      const fallbackResult = await generateText({
        model: getModel(promptContext.modelId),
        messages: fallbackMessages,
        temperature: LLM_TEMPERATURE,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        experimental_telemetry: {
          isEnabled: true,
          tracer: langfuseTracer,
          functionId: 'chat-completion-fallback',
          metadata: {
            agentId: ctx.effectiveAgentId,
            conversationId: ctx.conversationId,
            reason: 'tool_only_fallback',
          },
        },
      }).catch((fallbackError) => {
        logger.warn('Tool-only fallback LLM call failed', {
          conversationId: ctx.conversationId,
          error:
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError),
        })
        return null
      })

      if (fallbackResult?.text) {
        responseText = fallbackResult.text
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
  let pendingHumanHandoff: {
    conversationId: string
    organizationId: string
    reason: string
    phaseTraceId: string
  } | null = null

  if (useOverhaul && responseText) {
    // Extrair tools utilizadas nesta execução para contexto do guard
    const toolsUsed = result.steps?.flatMap(
      (step) => step.toolCalls?.map((tc) => tc.toolName) ?? [],
    ) ?? []

    // Cascata de seleção de produtos em contexto (seção 5.3 do plano):
    // 1. IDs dos produtos retornados por search_products nesta execução
    // 2. Substring match no catálogo completo contra o texto de resposta
    // 3. Se vazio: pular apenas price_mismatch (guard roda as demais categorias)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    let productsInContext: any[] = []

    try {
      // Passo 1: produtos retornados diretamente por search_products nos steps
      const searchProductsResults = result.steps?.flatMap((step) =>
        step.toolCalls
          ?.filter((tc) => tc.toolName === 'search_products')
          .map((tc) => {
            const toolResult = step.toolResults?.find(
              (tr) => tr.toolName === tc.toolName,
            )
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return toolResult?.output
          }) ?? [],
      ) ?? []

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
        const fullCatalog = await getProductCatalogForGuard(ctx.organizationId)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        productsInContext = fullCatalog.filter((item: { id: string }) =>
          productIdsFromTools.has(item.id),
        )
      }

      // Passo 2: substring match no catálogo se ainda não encontramos produtos
      if (productsInContext.length === 0 && responseText) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const fullCatalog = await getProductCatalogForGuard(ctx.organizationId)
        const normalizedResponse = responseText.toLowerCase()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        productsInContext = fullCatalog.filter((item: { name: string }) =>
          normalizedResponse.includes(item.name.toLowerCase()),
        )
      }

      // Passo 3: se ainda vazio, guard roda sem price_mismatch (flag para o guard)
      if (productsInContext.length === 0) {
        logger.info('single-guard: price validation skipped', {
          conversationId: ctx.conversationId,
          reason: 'no_product_context',
        })
        triggerMetadata.set('priceValidationSkipped', true)
      }
    } catch (catalogError) {
      logger.warn('single-guard: failed to load product catalog, skipping price validation', {
        conversationId: ctx.conversationId,
        error: catalogError instanceof Error ? catalogError.message : String(catalogError),
      })
      triggerMetadata.set('priceValidationSkipped', true)
    }

    // Guard attempt 1
    const guardStartMs = Date.now()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const guardResult1 = await runSingleGuard({
      customerMessage: responseText,
      context: { toolsUsed, productsInContext },
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
    })
    const guardDurationMs = Date.now() - guardStartMs

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const guard1Approved: boolean = guardResult1.approved === true
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const guard1Violations: Array<{ type: string; details: string; confidence: number }> =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      Array.isArray(guardResult1.violations) ? guardResult1.violations : []

    logger.info('single-guard completed', {
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      approved: guard1Approved,
      violationTypes: guard1Violations.map((v) => v.type),
      durationMs: guardDurationMs,
      attempt: 1,
    })

    triggerMetadata.set('guardApprovedOnFirstAttempt', guard1Approved)
    triggerMetadata.set(
      'guardViolationType',
      guard1Violations[0]?.type ?? null,
    )

    if (!guard1Approved) {
      // Guard rejeitou — invocar fallback para reescrita
      triggerMetadata.set('fallbackTriggered', true)
      ctx.traceTags.push('guard_rejected')

      const fallbackResult = await runSingleFallback({
        modelId: promptContext.modelId,
        rejectedMessage: responseText,
        guardViolations: guard1Violations,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        correctedContext: guardResult1.correctedContext,
        // Passar apenas as mensagens sem o system prompt original para evitar conflito
        llmMessages: llmMessages.filter((m) => m.role !== 'system'),
        toolResults: result.steps,
        agentPersona: {
          name: promptContext.agentName,
          // voice não está exposto no promptContext — o fallback usa apenas o nome
          voice: '',
        },
        conversationId: ctx.conversationId,
        organizationId: ctx.organizationId,
      }).catch((fallbackError) => {
        logger.warn('single-fallback call failed', {
          conversationId: ctx.conversationId,
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        })
        return null
      })

      const fallbackRawText = fallbackResult?.text
        ? stripLeakedToolCalls(fallbackResult.text).replace(/\n{3,}/g, '\n\n').trim()
        : ''

      if (fallbackRawText) {
        // Guard attempt 2 com o texto do fallback
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const guardResult2 = await runSingleGuard({
          customerMessage: fallbackRawText,
          context: { toolsUsed, productsInContext },
          conversationId: ctx.conversationId,
          organizationId: ctx.organizationId,
        })

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const guard2Approved: boolean = guardResult2.approved === true

        logger.info('single-guard completed', {
          conversationId: ctx.conversationId,
          organizationId: ctx.organizationId,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          approved: guardResult2.approved,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
          violationTypes: Array.isArray(guardResult2.violations)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            ? guardResult2.violations.map((v: { type: string }) => v.type)
            : [],
          attempt: 2,
        })

        if (guard2Approved) {
          // Fallback aprovado — usar como resposta final
          responseText = fallbackRawText
          ctx.traceTags.push('guard_fallback_approved')
        } else {
          // Degraded path: 2 rejeições consecutivas — escalar para humano
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const lastViolations: Array<{ type: string; details: string }> = Array.isArray(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            guardResult2.violations,
          )
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
            ? guardResult2.violations.map((v: { type: string; details: string }) => ({
                type: v.type,
                details: v.details,
              }))
            : []

          responseText = GENERIC_SAFE_FALLBACK
          pendingHumanHandoff = {
            conversationId: ctx.conversationId,
            organizationId: ctx.organizationId,
            reason: 'Guard bloqueou resposta 2x consecutivas. Conversa encaminhada para atendente.',
            phaseTraceId: ctx.conversationId,
          }

          await createConversationEvent({
            conversationId: ctx.conversationId,
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
          ctx.traceTags.push('guard_escalation')

          logger.info('single-guard: escalation triggered', {
            conversationId: ctx.conversationId,
            organizationId: ctx.organizationId,
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
          conversationId: ctx.conversationId,
          organizationId: ctx.organizationId,
          reason: 'Fallback não gerou resposta válida após rejeição do guard.',
          phaseTraceId: ctx.conversationId,
        }

        await createConversationEvent({
          conversationId: ctx.conversationId,
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
        ctx.traceTags.push('guard_escalation')
      }
    }
  }

  if (!responseText) {
    // Genuinamente sem resposta (sem tool calls ou fallback falhou)
    const hadToolCalls = result.steps?.some(
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
    await createConversationEvent({
      conversationId: ctx.conversationId,
      type: 'INFO',
      content: 'A IA não gerou uma resposta para esta mensagem.',
      metadata: { subtype: 'EMPTY_RESPONSE' satisfies InfoSubtype },
    })
    await revalidateConversationCache(ctx.conversationId, ctx.organizationId)
    ctx.traceTags.push('empty_response')
    triggerMetadata.set('model', promptContext.modelId)
    ctx.finalizeTrace('empty_response', {
      metadata: {
        finishReason: result.finishReason,
        creditsCost: emptyActualCost,
        resultTextLength: result.text?.length ?? 0,
        responderMessageLength: responseText.length,
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
        toolCalls: result.steps?.flatMap(
          (step) => step.toolCalls?.map((tc) => tc.toolName) ?? [],
        ) ?? [],
        fallbackAttempted: hadToolCalls,
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
        (step) =>
          step.toolCalls?.map((toolCall) => toolCall.toolName) ?? [],
      ) ?? [],
    classifiedStep,
    newStepOrder,
    stepAdvanced,
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
      const toolOutput = toolResult?.output as
        | { success?: boolean }
        | undefined
      const isToolSuccess = toolOutput?.success !== false
      ctx.tracker.addStep({
        type: 'TOOL_CALL',
        status: isToolSuccess ? 'PASSED' : 'FAILED',
        toolName: toolCall.toolName,
        input: toolCall.input as Record<string, unknown>,
        output: toolResult?.output as
          | Record<string, unknown>
          | undefined,
      })
    }
  }

  // Create tool events from LLM steps
  if (result.steps?.length) {
    await createToolEvents(ctx.conversationId, result.steps)
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
  // -----------------------------------------------------------------------
  const agentTriggeredHandOff = result.steps?.some((aiStep) =>
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
    ctx.finalizeTrace('ai_paused_during_generation', { metadata: { creditsCost: pausedActualCost } })
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
  // 8. Salvar resposta no banco + atualizar lastMessageRole na conversa
  // -----------------------------------------------------------------------
  const textToSend = prefixAttendantName(
    responseText,
    promptContext.agentName,
    conversation.inbox?.showAttendantName ?? false,
  )

  await db.message.create({
    data: {
      conversationId: ctx.conversationId,
      role: 'assistant',
      content: textToSend,
      inputTokens: totalUsage.inputTokens ?? null,
      outputTokens: totalUsage.outputTokens ?? null,
      metadata: {
        model: promptContext.modelId,
        llmDurationMs,
      },
    },
  })

  // Denormalizar role da última mensagem para viabilizar filtro "não respondidos"
  await db.conversation.update({
    where: { id: ctx.conversationId },
    data: { lastMessageRole: 'assistant', ...AUTO_REOPEN_FIELDS },
  })

  ctx.log('step:7 response_saved', 'PASS')

  await revalidateConversationCache(ctx.conversationId, ctx.organizationId)

  // -----------------------------------------------------------------------
  // 9. Ajuste de créditos (refund se custo real < estimado, debit extra se >)
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
  // 10. Send WhatsApp message + pre-register dedup keys
  // Delegado ao helper sendOutboundMessage que centraliza routing e dedup
  // -----------------------------------------------------------------------
  ctx.log('step:9 whatsapp_sending', 'PASS', {
    provider: ctx.message.provider,
    textLength: textToSend.length,
  })

  if (!conversation.inbox) {
    throw new Error(
      `Inbox not found for conversation: ${ctx.conversationId}`,
    )
  }

  if (useOverhaul) {
    // Fase 4: extrair blocos de mídia inline e enviar separadamente
    const inlineResult = await extractAndSendInlineMedia(textToSend, {
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      remoteJid: ctx.message.remoteJid,
      inboxProvider: conversation.inbox,
      credentials: conversation.inbox,
    })

    logger.info('single-v2 inline media send completed', {
      conversationId: ctx.conversationId,
      blocksSent: inlineResult.blocksSent,
      blocksSkipped: inlineResult.blocksSkipped,
      ssrfBlockedCount: inlineResult.ssrfBlockedUrls.length,
    })

    triggerMetadata.set('ssrfBlockedCount', inlineResult.ssrfBlockedUrls.length)

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
    })

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

  // -----------------------------------------------------------------------
  // 10a-guard. Handoff humano pendente do degraded path do guard
  // Chamado DEPOIS do send para evitar que aiPaused=true bloqueie o envio
  // -----------------------------------------------------------------------
  if (pendingHumanHandoff) {
    await triggerHumanHandoff(pendingHumanHandoff).catch((handoffError) => {
      logger.error('single-guard: triggerHumanHandoff failed', {
        conversationId: ctx.conversationId,
        error: handoffError instanceof Error ? handoffError.message : String(handoffError),
      })
    })
  }

  // -----------------------------------------------------------------------
  // 10b. Schedule follow-up (se agente tem regras de FUP para o step atual)
  // Non-fatal: falha no agendamento nao bloqueia o fluxo principal
  // -----------------------------------------------------------------------
  try {
    // Persistir avanço de step antes de buscar FUPs — garante que o step
    // correto é usado no agendamento e reseta o ciclo de FUP anterior
    if (stepAdvanced) {
      await db.conversation.update({
        where: { id: ctx.conversationId },
        data: {
          currentStepOrder: newStepOrder,
          // Limpar ciclo de FUP do step anterior ao avançar
          nextFollowUpAt: null,
          followUpCount: 0,
        },
      })

      await createConversationEvent({
        conversationId: ctx.conversationId,
        type: 'INFO',
        content: `Conversa avançou para etapa ${newStepOrder + 1}`,
        metadata: {
          subtype: 'STEP_ADVANCED' satisfies InfoSubtype,
          previousStep: promptContext.currentStepOrder,
          newStep: newStepOrder,
          newStepId: promptContext.steps[newStepOrder]?.id,
          newStepName: promptContext.steps[newStepOrder]?.name,
          classifiedByLlm: classifiedId ?? null,
        },
      })

      ctx.log('step:10a step_advanced', 'PASS', {
        previousStep: promptContext.currentStepOrder,
        newStep: newStepOrder,
        classifiedId,
        classifiedStep,
      })
    }

    // newStepOrder já tem o valor correto (currentStepOrder ou avançado)
    // — não precisa mais de findUnique para ler currentStepOrder
    const followUps = await getFollowUpsForStep(
      ctx.effectiveAgentId,
      newStepOrder,
    )

    if (followUps.length > 0) {
      const firstFollowUp = followUps[0] // order 0 — o primeiro da sequência
      const nextFollowUpAt = new Date(
        Date.now() + firstFollowUp.delayMinutes * 60 * 1000,
      )

      await db.conversation.update({
        where: { id: ctx.conversationId },
        data: {
          nextFollowUpAt,
          followUpCount: 0,
        },
      })

      ctx.log('step:10b follow_up_scheduled', 'PASS', {
        totalFollowUps: followUps.length,
        firstDelayMinutes: firstFollowUp.delayMinutes,
        nextFollowUpAt: nextFollowUpAt.toISOString(),
      })
      ctx.tracker.addStep({
        type: 'FOLLOW_UP_SCHEDULE',
        status: 'PASSED',
        output: {
          totalFollowUps: followUps.length,
          firstDelayMinutes: firstFollowUp.delayMinutes,
        },
      })
    } else {
      // Nenhum follow-up cobre este step — limpar qualquer FUP pendente
      await db.conversation.update({
        where: { id: ctx.conversationId },
        data: { nextFollowUpAt: null, followUpCount: 0 },
      })
      ctx.log('step:10b follow_up_scheduled', 'SKIP', {
        reason: 'no_follow_ups_for_step',
      })
      ctx.tracker.addStep({
        type: 'FOLLOW_UP_SCHEDULE',
        status: 'SKIPPED',
        output: { reason: 'no_follow_ups_for_step' },
      })
    }
  } catch (fupError) {
    logger.error('Follow-up scheduling failed', {
      conversationId: ctx.conversationId,
      error:
        fupError instanceof Error ? fupError.message : String(fupError),
    })
    // Limpar estado para evitar estado órfão que ficaria disparando o cron indefinidamente
    await db.conversation
      .update({
        where: { id: ctx.conversationId },
        data: { nextFollowUpAt: null, followUpCount: 0 },
      })
      .catch(() => {})
  }

  // -----------------------------------------------------------------------
  // 11. Memory compression — se >= threshold msgs, summarizar e arquivar
  // -----------------------------------------------------------------------
  const memoryResult = await compressMemory({ conversationId: ctx.conversationId })
  ctx.tracker.addStep({
    type: 'MEMORY_COMPRESSION',
    status: memoryResult.compressed ? 'PASSED' : 'SKIPPED',
    output: memoryResult.compressed
      ? { compressed: true, archivedCount: memoryResult.archivedCount }
      : { reason: memoryResult.reason ?? 'below_threshold' },
  })

  // -----------------------------------------------------------------------
  // 12. Logging final
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
    return observe(async () => {
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
    }, { name: 'process-agent-message-single-v2' })()
  },
  onFailure: async ({ payload, error }) =>
    handleAgentTaskFailure('process-agent-message-single-v2', { payload, error }),
})

import { task, tasks, logger, metadata as triggerMetadata, AbortTaskRunError } from '@trigger.dev/sdk/v3'
import { observe, updateActiveTrace } from '@langfuse/tracing'
import { flushLangfuse, langfuseTracer } from './lib/langfuse'
import { buildDispatcherCtx } from './lib/build-dispatcher-ctx'
import type { ProcessAgentMessagePayload } from './lib/build-dispatcher-ctx'
import { handleAgentTaskFailure } from './lib/handle-task-failure'
import { extractErrorMessage } from './lib/retry-helpers'
import { generateText, stepCountIs, Output, NoOutputGeneratedError } from 'ai'
import { z } from 'zod'
import { getModel } from '@/_lib/ai/provider'
import { SUMMARIZATION_MODEL_ID } from '@/_lib/ai/models'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { debitCredits, refundCredits } from '@/_lib/billing/credit-utils'
import { estimateMaxCost, calculateCreditCost } from '@/_lib/ai/pricing'
import {
  sendWhatsAppMessage,
  sendPresence,
} from '@/_lib/evolution/send-message'
import { resolveEvolutionCredentialsByInstanceName } from '@/_lib/evolution/resolve-credentials'
import { sendMetaTextMessage } from '@/_lib/meta/send-meta-message'
import { buildSystemPrompt } from './build-system-prompt'
import { buildToolSet } from './tools'
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
import type { ToolContext } from './tools/types'
import type { DispatcherCtx } from './dispatcher-types'

// Limite de mensagens carregadas no histórico para context LLM
const MESSAGE_HISTORY_LIMIT = 50

// Threshold de mensagens para disparar compressão de memória
const SUMMARIZATION_THRESHOLD = 12

// Quantidade de mensagens recentes a preservar ao arquivar
const KEEP_RECENT_MESSAGES = 3

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

// Tools de conteúdo: impactam a resposta ao cliente diretamente; excluem mutações de CRM (epicentro do loop).
const FALLBACK_TOOL_NAMES = [
  'search_knowledge',
  'search_products',
  'list_availability',
  'create_event',
] as const

// Custo em steps LLM de gerar structured output — o SDK usa um step extra para o output
const STEP_OUTPUT_OVERHEAD = 1

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

// Schema para structured output é construído dinamicamente por agente em runtime
// (ver `buildAgentOutputSchema` abaixo) — o enum de `currentStep` depende dos UUIDs dos steps.
// Separar message de currentStep evita que o LLM "vaze" JSON como texto ao cliente.
function buildAgentOutputSchema(stepIds: readonly string[]) {
  // Cast obrigatório: z.enum exige tuple não-vazia; o caller garante que stepIds.length > 0.
  const enumValues = stepIds as unknown as [string, ...string[]]
  return z.object({
    message: z.string().describe(
      'Sua resposta ao cliente. Texto natural que será enviado diretamente ao lead.',
    ),
    currentStep: z.enum(enumValues).describe(
      'UUID exato da etapa atual, escolhido entre os IDs listados no Processo de Atendimento. Só avança, nunca retrocede.',
    ),
  })
}

// ---------------------------------------------------------------------------
// Memory Compression — inline no v1 (função utilitária privada)
// ---------------------------------------------------------------------------

async function compressMemory(conversationId: string): Promise<boolean> {
  try {
    const totalMessages = await db.message.count({
      where: { conversationId, isArchived: false },
    })

    if (totalMessages < SUMMARIZATION_THRESHOLD) return false

    const allMessages = await db.message.findMany({
      where: { conversationId, isArchived: false },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
      },
    })

    const toArchiveCount = allMessages.length - KEEP_RECENT_MESSAGES
    if (toArchiveCount <= 0) return false

    const messagesToArchive = allMessages.slice(0, toArchiveCount)

    const transcript = messagesToArchive
      .map((msg) => `[${msg.role}]: ${msg.content}`)
      .join('\n')

    const summaryResult = await generateText({
      model: getModel(SUMMARIZATION_MODEL_ID),
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente especializado em gerar resumos densos de conversas. ' +
            'Resuma a conversa abaixo mantendo: pontos-chave discutidos, decisões tomadas, ' +
            'informações do cliente mencionadas e próximos passos combinados. ' +
            'Seja conciso mas não perca informações importantes. Responda em português.',
        },
        {
          role: 'user',
          content: `Resuma esta conversa:\n\n${transcript}`,
        },
      ],
      maxOutputTokens: 512,
      experimental_telemetry: {
        isEnabled: true,
        tracer: langfuseTracer,
        functionId: 'memory-compression',
        metadata: { conversationId, model: SUMMARIZATION_MODEL_ID },
      },
    })

    const summary = summaryResult.text

    if (!summary) {
      logger.warn('Summarization returned empty result', { conversationId })
      return false
    }

    const archiveIds = messagesToArchive.map((msg) => msg.id)

    await db.$transaction([
      db.conversation.update({
        where: { id: conversationId },
        data: { summary },
      }),
      db.message.updateMany({
        where: { id: { in: archiveIds } },
        data: { isArchived: true },
      }),
    ])

    logger.info('Memory compressed', {
      conversationId,
      archivedCount: archiveIds.length,
      summaryLength: summary.length,
    })
    return true
  } catch (error) {
    // Non-fatal: falha na compressão não bloqueia o fluxo
    logger.warn('Memory compression failed', { conversationId, error })
    return false
  }
}

// ---------------------------------------------------------------------------
// Pipeline Single V1 — Fluxo estável (single-agent linear)
// ---------------------------------------------------------------------------

export async function runSingleV1(
  ctx: DispatcherCtx,
): Promise<{ success: true } | { skipped: true; reason?: string }> {
  // ===================================================================
  // PIPELINE V1 — Fluxo legado (inalterado)
  // A partir daqui, nenhuma linha do v1 foi modificada.
  // ===================================================================
  const [promptContext, messageHistory, conversation] =
    await Promise.all([
      buildSystemPrompt(ctx.effectiveAgentId, ctx.conversationId, ctx.organizationId, ctx.groupPromptContext),
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

    // Notificar OWNER/ADMIN apenas se nao existe notificacao nao lida com mesmo titulo
    // nas ultimas 24h — evita spam por cada mensagem sem credito
    const recentCreditNotification = await db.notification.findFirst({
      where: {
        organizationId: ctx.organizationId,
        type: 'SYSTEM',
        title: 'Créditos de IA esgotados',
        readAt: null,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })

    if (!recentCreditNotification) {
      const [orgAdmins, organization] = await Promise.all([
        db.member.findMany({
          where: {
            organizationId: ctx.organizationId,
            role: { in: ['OWNER', 'ADMIN'] },
            status: 'ACCEPTED',
            userId: { not: null },
          },
          select: { userId: true },
        }),
        db.organization.findUnique({
          where: { id: ctx.organizationId },
          select: { slug: true },
        }),
      ])

      if (orgAdmins.length > 0) {
        // Criar notificacoes diretamente (sem import server-only — ambiente Trigger.dev)
        for (const admin of orgAdmins) {
          void db.notification.create({
            data: {
              organizationId: ctx.organizationId,
              userId: admin.userId!,
              type: 'SYSTEM',
              title: 'Créditos de IA esgotados',
              body: 'Seus créditos de IA acabaram. Recarregue para continuar usando o agente.',
              actionUrl: organization
                ? `/org/${organization.slug}/settings/billing`
                : null,
              resourceType: 'credit',
              resourceId: null,
            },
          })
        }
      }
    }

    ctx.tracker.addStep({
      type: 'CREDIT_CHECK',
      status: 'FAILED',
      output: { reason: 'no_credits', estimatedCost },
    })
    await revalidateConversationCache(ctx.conversationId, ctx.organizationId)
    ctx.finalizeTrace('no_credits', { metadata: { estimatedCost } })
    await ctx.tracker.skip('no_credits')
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

  const llmStartMs = Date.now()

  // Agentes sem steps não precisam de structured output — comportamento idêntico ao atual
  const hasSteps = promptContext.totalSteps > 0

  // Schema dinâmico: enum de UUIDs dos steps do agente atual.
  // Evita ambiguidade 0/1-indexed no canal LLM↔app e blinda contra hallucination
  // — structured output restringe tokens válidos ao conjunto de IDs declarados.
  const agentOutputSchema = hasSteps
    ? buildAgentOutputSchema(promptContext.steps.map((step) => step.id))
    : undefined

  // IIFE: `.catch(fn)` onde `fn` retorna `as typeof result` cria ciclo de tipo; try/catch quebra o ciclo.
  const result = await (async () => {
    try {
      return await generateText({
        model: getModel(promptContext.modelId),
        messages: llmMessages,
        tools,
        temperature: LLM_TEMPERATURE,
        // Output estruturado exige um step extra no SDK — compensamos com +1
        stopWhen: stepCountIs(4 + (hasSteps ? STEP_OUTPUT_OVERHEAD : 0)),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        // Quando há steps, forçamos output tipado para separar message de currentStep
        output: agentOutputSchema ? Output.object({ schema: agentOutputSchema }) : undefined,

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
      })
    } catch (llmError: unknown) {
      const isNoOutput = NoOutputGeneratedError.isInstance(llmError)

      if (isNoOutput) {
        // NoOutputGeneratedError: stepCountIs(N) esgotou sem output estruturado.
        // Ocorre quando tools + Output.object são combinados na mesma chamada.
        ctx.log('step:5 llm_call', 'EXIT', {
          reason: 'no_output_generated',
          error: llmError instanceof Error ? llmError.message : String(llmError),
        })
        ctx.tracker.addStep({
          type: 'LLM_CALL',
          status: 'FAILED',
          output: {
            reason: 'no_output_generated',
            error: llmError instanceof Error ? llmError.message : String(llmError),
          },
        })
        ctx.traceTags.push('no_output_generated')

        // Filtra o `tools` JÁ configurado — não adiciona tools novas ao agente.
        const fallbackTools = tools
          ? (Object.fromEntries(
              Object.entries(tools).filter(([name]) =>
                FALLBACK_TOOL_NAMES.includes(name as never),
              ),
            ) as typeof tools)
          : undefined
        const hasFallbackTools =
          fallbackTools && Object.keys(fallbackTools).length > 0

        const fallbackResult = await generateText({
          model: getModel(promptContext.modelId),
          messages: llmMessages,
          tools: hasFallbackTools ? fallbackTools : undefined,
          temperature: LLM_TEMPERATURE,
          stopWhen: stepCountIs(2),
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          experimental_telemetry: {
            isEnabled: true,
            tracer: langfuseTracer,
            functionId: 'chat-completion-no-output-fallback',
            metadata: {
              agentId: ctx.effectiveAgentId,
              conversationId: ctx.conversationId,
              model: promptContext.modelId,
              reason: 'no_output_generated_recovery',
            },
          },
        }).catch((fallbackError) => {
          logger.warn('Inline fallback after NoOutputGeneratedError failed', {
            conversationId: ctx.conversationId,
            organizationId: ctx.organizationId,
            error:
              fallbackError instanceof Error
                ? fallbackError.message
                : String(fallbackError),
          })
          return null
        })

        if (fallbackResult?.text) {
          ctx.traceTags.push('no_output_fallback_recovered')

          // Result sintético: steps vazio (sem tool events) e output undefined (sem avanço de step).
          return {
            text: fallbackResult.text,
            steps: [] as never[],
            usage: fallbackResult.usage,
            response: { messages: fallbackResult.response.messages },
            finishReason: fallbackResult.finishReason,
            output: undefined,
          }
        }

        // Fallback também falhou (erro ou texto vazio) → abort sem retry.
        // AbortTaskRunError impede retentativas do Trigger.dev — evita agravar o loop.
        await refundCredits(
          ctx.organizationId,
          estimatedCost,
          'Refund — NoOutputGeneratedError (fallback inline também falhou)',
          {
            agentId: ctx.effectiveAgentId,
            conversationId: ctx.conversationId,
            model: promptContext.modelId,
            estimatedCost,
            reason: 'no_output_generated_fallback_failed',
          },
        ).catch((refundError) => {
          logger.error('Failed to refund credits after NoOutputGeneratedError', {
            ...ctx.baseLogContext,
            refundError,
          })
        })

        throw new AbortTaskRunError(
          `tools+Output.object NoOutput — inline fallback failed, aborting without retry: ${extractErrorMessage(llmError)}`,
        )
      }

      // Outros erros (rede, 5xx do provider, etc.): comportamento atual — refund + re-throw para retry
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
      await refundCredits(
        ctx.organizationId,
        estimatedCost,
        'Refund — erro na chamada LLM',
        {
          agentId: ctx.effectiveAgentId,
          conversationId: ctx.conversationId,
          model: promptContext.modelId,
          estimatedCost,
          reason: 'llm_error',
        },
      ).catch((refundError) => {
        logger.error('Failed to refund credits after LLM error', {
          ...ctx.baseLogContext,
          refundError,
        })
      })
      throw llmError
    }
  })()

  const llmDurationMs = Date.now() - llmStartMs

  // Quando Output.object está ativo, result.text do último step é o JSON stringified —
  // não serve como mensagem ao cliente. A mensagem real vem de result.output.message.
  let responseText = hasSteps
    ? (result.output?.message ?? '')
    : result.text

  // Guard de monotonicidade: step só avança, nunca regride.
  // O LLM retorna o UUID do step — convertemos para `order` via lookup no context.
  // Math.max previne regressão; Math.min previne avanço além do último step.
  const classifiedId = hasSteps ? result.output?.currentStep : undefined
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

      // Construir mensagens com o histórico + resultados das tools para contexto
      const fallbackMessages = [
        ...llmMessages,
        // Incluir um resumo das ações realizadas pelas tools
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

  if (!responseText) {
    // Genuinamente sem resposta (sem tool calls ou fallback falhou)
    const hadToolCalls = result.steps?.some(
      (step) => step.toolCalls && step.toolCalls.length > 0,
    ) ?? false
    const emptyTotalTokens =
      (result.usage?.inputTokens ?? 0) +
      (result.usage?.outputTokens ?? 0)
    const emptyActualCost = calculateCreditCost(
      promptContext.modelId,
      emptyTotalTokens,
    )
    const emptyRefund = estimatedCost - emptyActualCost
    if (emptyRefund > 0) {
      await refundCredits(
        ctx.organizationId,
        emptyRefund,
        'Refund — LLM empty response',
        {
          agentId: ctx.effectiveAgentId,
          conversationId: ctx.conversationId,
          model: promptContext.modelId,
          estimatedCost,
          actualCost: emptyActualCost,
        },
      )
    }
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
        // result.text é o JSON raw quando Output.object ativo — útil para debug
        resultTextLength: result.text?.length ?? 0,
        outputMessageLength: hasSteps ? (result.output?.message?.length ?? 0) : undefined,
      },
    })
    ctx.log('step:5 llm_call', 'EXIT', {
      reason: 'empty_response',
      llmDurationMs,
      actualCost: emptyActualCost,
      finishReason: result.finishReason,
      outputTokens: result.usage?.outputTokens ?? 0,
      stepsCount: result.steps?.length ?? 0,
      // result.text pode ser JSON quando Output.object ativo — manter para debug
      resultTextLength: result.text?.length ?? 0,
      outputMessageLength: hasSteps ? (result.output?.message?.length ?? 0) : undefined,
    })
    ctx.tracker.addStep({
      type: 'LLM_CALL',
      status: 'FAILED',
      durationMs: llmDurationMs,
      output: {
        reason: 'empty_response',
        resultText: result.text ?? null,
        resultTextLength: result.text?.length ?? 0,
        outputMessageLength: hasSteps ? (result.output?.message?.length ?? 0) : undefined,
        finishReason: result.finishReason,
        outputTokens: result.usage?.outputTokens ?? 0,
        inputTokens: result.usage?.inputTokens ?? 0,
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
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      creditsCost: emptyActualCost,
      finishReason: result.finishReason,
      metadata: {
        resultText: result.text ?? null,
        stepsCount: result.steps?.length ?? 0,
        fallbackAttempted: hadToolCalls,
      },
    })
    return { skipped: true, reason: 'empty_response' }
  }

  ctx.log('step:5 llm_response', 'PASS', {
    llmDurationMs,
    inputTokens: result.usage?.inputTokens,
    outputTokens: result.usage?.outputTokens,
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
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
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
    }
  }

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
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        metadata: {
          model: promptContext.modelId,
          skippedReason: 'ai_paused_during_generation',
          llmDurationMs,
        },
      },
    })

    // Ajustar créditos: cobrar custo real, refundar a diferença
    const pausedTotalTokens =
      (result.usage?.inputTokens ?? 0) +
      (result.usage?.outputTokens ?? 0)
    const pausedActualCost = calculateCreditCost(
      promptContext.modelId,
      pausedTotalTokens,
    )
    const pausedRefund = estimatedCost - pausedActualCost
    if (pausedRefund > 0) {
      await refundCredits(
        ctx.organizationId,
        pausedRefund,
        'Refund — IA pausada durante geração',
        {
          agentId: ctx.effectiveAgentId,
          conversationId: ctx.conversationId,
          model: promptContext.modelId,
          estimatedCost,
          actualCost: pausedActualCost,
        },
      )
    }

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
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      creditsCost: pausedActualCost,
      finishReason: result.finishReason,
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
      inputTokens: result.usage?.inputTokens ?? null,
      outputTokens: result.usage?.outputTokens ?? null,
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
  const totalTokens =
    (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0)
  const actualCost = calculateCreditCost(
    promptContext.modelId,
    totalTokens,
  )
  const creditDiff = estimatedCost - actualCost

  if (creditDiff > 0) {
    await refundCredits(
      ctx.organizationId,
      creditDiff,
      'Ajuste pós-LLM — custo real menor que estimado',
      {
        agentId: ctx.effectiveAgentId,
        conversationId: ctx.conversationId,
        model: promptContext.modelId,
        estimatedCost,
        actualCost,
        totalTokens,
      },
    )
    ctx.log('step:8 credit_adjustment', 'PASS', {
      type: 'refund',
      creditDiff,
      estimatedCost,
      actualCost,
      totalTokens,
    })
  } else if (creditDiff < 0) {
    // Custo real maior que estimado (raro) — debitar diferença
    const extraDebited = await debitCredits(
      ctx.organizationId,
      -creditDiff,
      'Ajuste pós-LLM — custo real maior que estimado',
      {
        agentId: ctx.effectiveAgentId,
        conversationId: ctx.conversationId,
        model: promptContext.modelId,
        estimatedCost,
        actualCost,
        totalTokens,
        type: 'adjustment',
      },
      false, // não incrementar totalMessagesUsed
    )
    ctx.log('step:8 credit_adjustment', extraDebited ? 'PASS' : 'SKIP', {
      type: 'extra_debit',
      creditDiff: -creditDiff,
      estimatedCost,
      actualCost,
      totalTokens,
    })
  } else {
    ctx.log('step:8 credit_adjustment', 'PASS', {
      type: 'exact',
      estimatedCost,
      actualCost,
      totalTokens,
    })
  }

  // -----------------------------------------------------------------------
  // 10. Send WhatsApp message + pre-register dedup keys
  // Roteamento pelo provider: Evolution ou Meta Cloud
  // -----------------------------------------------------------------------
  let sentMessageIds: string[]

  ctx.log('step:9 whatsapp_sending', 'PASS', {
    provider: ctx.message.provider,
    textLength: textToSend.length,
  })

  if (ctx.message.provider === 'simulator') {
    // Simulator: a mensagem do assistente já foi salva no banco no step 8.
    // Não há provider externo — gerar ID fictício apenas para manter consistência
    // com o fluxo de dedup e logging que espera sentMessageIds preenchido.
    sentMessageIds = [`sim_resp_${crypto.randomUUID()}`]
    ctx.log('step:9 simulator_send', 'PASS', { textLength: textToSend.length })
  } else if (ctx.message.provider === 'meta_cloud') {
    // Para Meta Cloud: buscar metaAccessToken do inbox (nunca vem no payload por seguranca)
    const metaInbox = await db.inbox.findFirst({
      where: { metaPhoneNumberId: ctx.message.instanceName },
      select: { metaAccessToken: true },
    })

    if (!metaInbox?.metaAccessToken) {
      throw new Error(
        `Meta access token not found for phoneNumberId: ${ctx.message.instanceName}`,
      )
    }

    sentMessageIds = await sendMetaTextMessage(
      ctx.message.instanceName,
      metaInbox.metaAccessToken,
      ctx.message.remoteJid.replace('@s.whatsapp.net', ''),
      textToSend,
    )
  } else if (ctx.message.provider === 'z_api') {
    // Para Z-API: buscar credenciais do inbox (per-inbox, nunca no payload)
    const zapiInbox = await db.inbox.findFirst({
      where: { zapiInstanceId: ctx.message.instanceName },
      select: {
        zapiInstanceId: true,
        zapiToken: true,
        zapiClientToken: true,
      },
    })

    if (
      !zapiInbox?.zapiToken ||
      !zapiInbox?.zapiClientToken ||
      !zapiInbox?.zapiInstanceId
    ) {
      throw new Error(
        `Z-API credentials not found for instanceId: ${ctx.message.instanceName}`,
      )
    }

    const { sendZApiTextMessage } =
      await import('@/_lib/zapi/send-message')
    sentMessageIds = await sendZApiTextMessage(
      {
        instanceId: zapiInbox.zapiInstanceId,
        token: zapiInbox.zapiToken,
        clientToken: zapiInbox.zapiClientToken,
      },
      ctx.message.remoteJid.replace('@s.whatsapp.net', ''),
      textToSend,
    )
  } else {
    // Provider Evolution (default)
    const evolutionCredentials = await resolveEvolutionCredentialsByInstanceName(
      ctx.message.instanceName,
    )
    sentMessageIds = await sendWhatsAppMessage(
      ctx.message.instanceName,
      ctx.message.remoteJid,
      textToSend,
      evolutionCredentials,
    )
  }

  // Pré-registrar dedup keys para que o webhook fromMe ignore estas mensagens
  // (evita duplicata no banco + auto-pause da IA)
  // Simulator não tem webhook — IDs fictícios não precisam ser registrados no Redis
  if (ctx.message.provider !== 'simulator') {
    await Promise.all(
      sentMessageIds.map((sentId) =>
        redis.set(`dedup:${sentId}`, '1', 'EX', 300).catch(() => {}),
      ),
    )
  }

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
  const memoryCompressed = await compressMemory(ctx.conversationId)
  ctx.tracker.addStep({
    type: 'MEMORY_COMPRESSION',
    status: memoryCompressed ? 'PASSED' : 'SKIPPED',
    output: memoryCompressed ? { compressed: true } : { reason: 'below_threshold' },
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
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    },
  })

  ctx.log('step:10 completed', 'PASS', {
    inputTokens: result.usage?.inputTokens,
    outputTokens: result.usage?.outputTokens,
    llmDurationMs,
    totalDurationMs,
  })

  // Persistir execução completa em batch — falha non-fatal (try/catch interno)
  await ctx.tracker.complete({
    modelId: promptContext.modelId,
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    creditsCost: actualCost,
    finishReason: result.finishReason,
  })

  return { success: true }
}

// ---------------------------------------------------------------------------
// Task Trigger.dev — registra esta pipeline como task independente
// ---------------------------------------------------------------------------

export const processAgentMessageSingleV1 = task({
  id: 'process-agent-message-single-v1',
  retry: { maxAttempts: 3 },
  run: async (payload: ProcessAgentMessagePayload, { ctx: triggerCtx }) => {
    return observe(async () => {
      try {
        const result = await buildDispatcherCtx(payload, triggerCtx)
        if ('skipped' in result) return result
        return runSingleV1(result.ctx)
      } finally {
        await flushLangfuse()
      }
    }, { name: 'process-agent-message-single-v1' })()
  },
  onFailure: async ({ payload, error }) =>
    handleAgentTaskFailure('process-agent-message-single-v1', { payload, error }),
})

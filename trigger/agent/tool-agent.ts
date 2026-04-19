import { schemaTask, logger, metadata, AbortTaskRunError } from '@trigger.dev/sdk/v3'
import type { ModelMessage } from 'ai'
import { generateObject, generateText, stepCountIs } from 'ai'
import { z } from 'zod'
import { startObservation } from '@langfuse/tracing'
import { getModel } from '@/_lib/ai/provider'
import { buildToolAgentPrompt } from '../lib/prompt-builders'
import { extractToolDataForResponder } from '../lib/tool-data-extractor'
import type { ToolStep } from '../lib/tool-data-extractor'
import { abortIfPermanent } from '../lib/retry-helpers'
import { buildMutationToolSet } from '../tools/build-mutation-tool-set'
import { flushLangfuse, langfuseTracer } from '../lib/langfuse'
import { promptBaseContextSchema } from '../lib/prompt-base-context'
import { modelMessageSchema, toolContextSchema } from '../lib/two-phase-types'
import type { ToolAgentTrace } from '../lib/two-phase-types'
import type { GroupToolConfig } from '../tools/transfer-to-agent'
import { stepActionSchema } from '@/_actions/agent/shared/step-action-schema'

// Tools que, uma vez executadas com sucesso neste turno, não devem rodar de
// novo. Complementam create_task, create_event, search_knowledge,
// search_products, list_availability — essas podem ser chamadas múltiplas
// vezes por turno legitimamente (buscas distintas, múltiplas tarefas).
const IDEMPOTENT_TOOL_NAMES = [
  'update_deal',
  'move_deal',
  'update_contact',
  'update_event',
  'hand_off_to_human',
  'transfer_to_agent',
] as const

const toolAgentPayloadSchema = z.object({
  modelId: z.string(),
  promptBaseContext: promptBaseContextSchema,
  toolContext: toolContextSchema,
  // Histórico de mensagens serializado — enriquecido com metadata pelo orchestrator
  // antes de ser passado aqui (§1.9.1 do plano).
  llmMessages: z.array(modelMessageSchema),
  conversationId: z.string().uuid(),
  organizationId: z.string().uuid(),
  agentId: z.string().uuid(),
  phaseTraceId: z.string().uuid(),
  // OTEL trace ID (hex 32 chars) para distributed tracing Langfuse cross-worker
  langfuseTraceId: z.string().length(32),
  // OTEL span ID (hex 16 chars) do span pai no orchestrator
  langfuseParentSpanId: z.string().length(16),
})

export const toolAgent = schemaTask({
  id: 'tool-agent',
  schema: toolAgentPayloadSchema,
  // 60s cobre até 6 steps de tool call + latência de rede + retries
  maxDuration: 60,
  retry: {
    maxAttempts: 3,
    factor: 1.8,
    minTimeoutInMs: 500,
    maxTimeoutInMs: 30_000,
    randomize: true,
  },
  run: async (payload) => {
    const {
      conversationId,
      organizationId,
      phaseTraceId,
      modelId,
      promptBaseContext,
      toolContext,
      llmMessages,
      langfuseTraceId,
      langfuseParentSpanId,
    } = payload

    // Distributed tracing Langfuse — cria span filho do orchestrator (cross-worker).
    // `startObservation` com `parentSpanContext` enleia este subtask ao trace raiz
    // criado pelo orchestrator via observe(). Os spans do AI SDK
    // (`experimental_telemetry`) ficam automaticamente filhos deste span.
    const langfuseSpan = startObservation(
      'tool-agent',
      {},
      {
        parentSpanContext: {
          traceId: langfuseTraceId,
          spanId: langfuseParentSpanId,
          traceFlags: 1,
        },
      },
    )

    const startedAt = Date.now()

    logger.info('Tool agent started', {
      conversationId,
      organizationId,
      phaseTraceId,
      stage: 'tool_agent',
      modelId,
    })

    try {
      // System prompt filtrado pela "lente operacional" — exclui E2/E4 e
      // remove search_knowledge, send_media, send_product_media (§4.1 do plano).
      const system = buildToolAgentPrompt(promptBaseContext)

      // Derivar stepActions a partir dos steps do funil — necessário para que o
      // buildMutationToolSet saiba quais tools cada step autoriza.
      const stepActions = promptBaseContext.steps.flatMap((step) => {
        const parsed = z.array(stepActionSchema).safeParse(step.actions)
        return parsed.success ? parsed.data : []
      })

      // GlobalFlags controlam tools que não derivam de step actions (catálogo,
      // base de conhecimento). Espelham o mesmo padrão do v1 em process-agent-message.ts.
      const globalFlags = {
        hasKnowledgeBase: promptBaseContext.hasKnowledgeBase,
        hasActiveProducts: promptBaseContext.hasActiveProducts,
        hasActiveProductsWithMedia: promptBaseContext.hasActiveProductsWithMedia,
      }

      // Config do grupo para a tool transfer_to_agent — presente apenas quando
      // há múltiplos workers disponíveis (§4.1 do plano).
      const groupConfig: GroupToolConfig | undefined =
        promptBaseContext.groupContext &&
        promptBaseContext.groupContext.workers.length > 1
          ? {
              groupId: promptBaseContext.groupContext.groupId,
              workers: promptBaseContext.groupContext.workers,
            }
          : undefined

      // Wrapper sobre buildToolSet que remove search_knowledge, send_media e
      // send_product_media — tools proibidas no Agent 1 (§4.1 Construção do toolSet).
      const tools = buildMutationToolSet(
        promptBaseContext.toolsEnabled,
        toolContext,
        stepActions,
        globalFlags,
        groupConfig,
      )

      const result = await generateText({
        model: getModel(modelId),
        system,
        messages: llmMessages,
        tools,
        // Paridade com v1 — default do Gemini (~1.0) gera tool-calls redundantes
        // com "justificativas" levemente diferentes, alimentando o loop intra-turno.
        temperature: 0.4,
        // Sem Output.object aqui: combinar tools + structured output com Gemini
        // faz o modelo ficar fixado em tool-calls e nunca emitir o schema,
        // disparando "No output generated". A classificação de step é feita em
        // chamada dedicada (generateObject) logo abaixo.
        stopWhen: stepCountIs(4),

        // Remove do toolSet, a cada step, as tools idempotentes que já foram
        // executadas com sucesso em steps anteriores deste turno. Substitui o
        // antigo wrapToolsWithDedup (execute-wrapper com retorno textual) por
        // uma barreira estrutural do SDK: a tool deixa de existir para o
        // modelo, eliminando o loop de reavaliação observado em Gemini 2.5
        // Pro, onde o modelo interpretava o retorno "alreadyExecutedThisTurn"
        // como feedback e retentava com novas justificativas.
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

        // Preserva log estruturado de callReason que antes vivia no wrapper
        // de dedup. Útil para diagnóstico rápido no Trigger.dev de loops e
        // chamadas indevidas — complementa o trace do Langfuse.
        onStepFinish: async ({ toolCalls }) => {
          for (const toolCall of toolCalls ?? []) {
            const input = toolCall.input as Record<string, unknown> | undefined
            const callReason =
              input && 'callReason' in input
                ? String(input.callReason ?? '')
                : null
            if (!callReason) continue
            logger.info('Tool call reason', {
              toolName: toolCall.toolName,
              callReason,
              conversationId,
              phaseTraceId,
            })
          }
        },

        experimental_telemetry: {
          isEnabled: true,
          tracer: langfuseTracer,
          functionId: 'agent-tool-executor',
          metadata: { phaseTraceId, stage: 'tool_agent' },
        },
      })

      // Mapear result.steps do AI SDK para o shape ToolStep do extractor.
      // AI SDK: toolCall.input / toolResult.output
      // ToolStep:  toolCalls[].args / toolResults[].result
      const toolSteps: ToolStep[] = (result.steps ?? []).map((aiStep) => ({
        toolCalls: (aiStep.toolCalls ?? []).map((toolCall) => ({
          toolName: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          args: toolCall.input,
        })),
        toolResults: (aiStep.toolResults ?? []).map((toolResult) => ({
          toolName: toolResult.toolName,
          toolCallId: toolResult.toolCallId,
          result: toolResult.output,
        })),
      }))

      // Extrai dados factuais das tools para o canal estruturado Agent 1 → Agent 2.
      // Erros permanentes em tools críticas acionam AbortTaskRunError via abortIfPermanent.
      const dataFromTools = extractToolDataForResponder(toolSteps, {
        onToolError: (toolName, error) =>
          abortIfPermanent(error, { tool: toolName }),
      })

      // ===================================================================
      // Classificação de step em chamada dedicada (generateObject, sem tools).
      // Separado do generateText para evitar o bug de Gemini ficar fixado em
      // tool-calls e nunca emitir structured output.
      // ===================================================================
      const stepIds = promptBaseContext.steps.map((step) => step.id)
      let classifiedStepId: string | null = null

      if (stepIds.length > 0) {
        const classifierSchema = z.object({
          currentStep: z.enum(stepIds as [string, ...string[]]).nullable(),
        })

        // Reenvia histórico + trajetória do turno (response.messages traz
        // tool-call/tool-result nativos) para o classificador ter contexto pleno.
        const classifierMessages: ModelMessage[] = [
          ...llmMessages,
          ...result.response.messages,
        ]

        try {
          const classifierResult = await generateObject({
            model: getModel(modelId),
            system,
            messages: classifierMessages,
            schema: classifierSchema,
            temperature: 0.4,
            experimental_telemetry: {
              isEnabled: true,
              tracer: langfuseTracer,
              functionId: 'agent-tool-classifier',
              metadata: { phaseTraceId, stage: 'tool_agent_classifier' },
            },
          })
          classifiedStepId = classifierResult.object.currentStep ?? null
        } catch (classifierError) {
          logger.warn('Step classifier failed — keeping current step', {
            conversationId,
            phaseTraceId,
            error:
              classifierError instanceof Error
                ? classifierError.message
                : String(classifierError),
          })
        }
      }

      const inferredStepOrder = classifiedStepId
        ? (promptBaseContext.steps.find((step) => step.id === classifiedStepId)
            ?.order ?? null)
        : null

      // Construir trace detalhado para logs/Langfuse — NUNCA enviado ao Agent 2.
      const toolCallsTrace: ToolAgentTrace['toolCalls'] = (result.steps ?? []).flatMap(
        (aiStep) =>
          (aiStep.toolCalls ?? []).map((toolCall) => {
            const matchingResult = (aiStep.toolResults ?? []).find(
              (tr) => tr.toolCallId === toolCall.toolCallId,
            )
            const isSuccess =
              matchingResult !== undefined &&
              !(
                typeof matchingResult.output === 'object' &&
                matchingResult.output !== null &&
                (matchingResult.output as Record<string, unknown>)['success'] === false
              )

            return {
              toolName: toolCall.toolName,
              toolCallId: toolCall.toolCallId,
              input: toolCall.input,
              success: isSuccess,
              durationMs: 0, // AI SDK não expõe duração por tool call
            }
          }),
      )

      const totalTokens = result.usage.totalTokens ?? 0
      const inputTokens = result.usage.inputTokens ?? 0
      const outputTokens = result.usage.outputTokens ?? 0

      metadata.set('tokensUsed', totalTokens)
      metadata.set('durationMs', Date.now() - startedAt)
      metadata.set(
        'toolsCalled',
        (result.steps ?? []).flatMap((step) =>
          (step.toolCalls ?? []).map((toolCall) => toolCall.toolName),
        ),
      )

      logger.info('Tool agent completed', {
        conversationId,
        organizationId,
        phaseTraceId,
        stage: 'tool_agent',
        toolCallsCount: toolCallsTrace.length,
        stepsUsed: result.steps?.length ?? 0,
        errorsCount: dataFromTools.errors?.length ?? 0,
        requiresHumanHandoff: dataFromTools.requiresHumanHandoff ?? false,
        inferredStepOrder,
        durationMs: Date.now() - startedAt,
      })

      const toolAgentTrace: ToolAgentTrace = {
        phaseTraceId,
        toolCalls: toolCallsTrace,
        stepsUsed: result.steps?.length ?? 0,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
        },
        // rawText descartado do caminho de resposta — preservado apenas para debug
        rawText: result.text ?? '',
        inferredStepOrder,
        classifiedStepId,
      }

      return { dataFromTools, toolAgentTrace, responseMessages: result.response.messages }
    } finally {
      langfuseSpan.end()
      await flushLangfuse()
    }
  },
})

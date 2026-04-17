import { schemaTask, logger, metadata, AbortTaskRunError } from '@trigger.dev/sdk/v3'
import { generateText, Output, stepCountIs } from 'ai'
import { z } from 'zod'
import { startObservation } from '@langfuse/tracing'
import { getModel } from '@/_lib/ai/provider'
import { buildToolAgentPrompt } from '../lib/prompt-builders'
import { extractToolDataForResponder } from '../lib/tool-data-extractor'
import type { ToolStep } from '../lib/tool-data-extractor'
import { abortIfPermanent } from '../lib/retry-helpers'
import { buildMutationToolSet } from '../tools/build-mutation-tool-set'
import { promptBaseContextSchema } from '../lib/prompt-base-context'
import { modelMessageSchema, toolContextSchema } from '../lib/two-phase-types'
import type { ToolAgentTrace } from '../lib/two-phase-types'
import type { GroupToolConfig } from '../tools/transfer-to-agent'
import { stepActionSchema } from '@/_actions/agent/shared/step-action-schema'

// Output estruturado leve — o LLM declara o step do funil inferido após execução
// das tools. Ver §1.7 (ToolAgentTrace.inferredStepOrder) do plano.
const toolAgentOutputSchema = z.object({
  inferredStepOrder: z.number().int().min(0).nullable(),
})

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
        // generateText + Output.object combina tool calls com output estruturado.
        // generateObject não aceita tools, por isso este padrão (§8.1 do plano).
        output: Output.object({ schema: toolAgentOutputSchema }),
        // 6 steps máximos: cobre tool calls encadeadas + step de output estruturado
        stopWhen: stepCountIs(6),
        experimental_telemetry: {
          isEnabled: true,
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

      // Validação defensiva — Zod já garante min(0) no parse; null é explícito
      // quando o LLM não tem confiança suficiente para classificar o step.
      const rawInferred = result.output?.inferredStepOrder ?? null
      const inferredStepOrder =
        rawInferred !== null && rawInferred >= 0 ? rawInferred : null

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
      }

      return { dataFromTools, toolAgentTrace }
    } finally {
      langfuseSpan.end()
    }
  },
})

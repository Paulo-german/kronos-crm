import { schemaTask, logger, metadata } from '@trigger.dev/sdk/v3'
import { generateText, stepCountIs, Output } from 'ai'
import { z } from 'zod'
import { startObservation } from '@langfuse/tracing'
import { getModel } from '@/_lib/ai/provider'
import { promptBaseContextSchema } from '../lib/prompt-base-context'
import { toolContextSchema, toolDataForResponderSchema, modelMessageSchema } from '../lib/two-phase-types'
import { buildResponseAgentPrompt } from '../lib/prompt-builders'
import { formatDataFromTools } from '../lib/format-data-from-tools'
import { createSearchKnowledgeTool } from '../tools/search-knowledge'
import { createSearchProductsTool } from '../tools/search-products'

const responseAgentPayloadSchema = z.object({
  modelId: z.string(),
  promptBaseContext: promptBaseContextSchema,
  toolContext: toolContextSchema,
  llmMessages: z.array(modelMessageSchema),
  dataFromTools: toolDataForResponderSchema,
  conversationId: z.string().uuid(),
  organizationId: z.string().uuid(),
  phaseTraceId: z.string().uuid(),
  langfuseTraceId: z.string().length(32),
  langfuseParentSpanId: z.string().length(16),
  regenerationHint: z.string().optional(),
})

export const responseAgent = schemaTask({
  id: 'response-agent',
  schema: responseAgentPayloadSchema,
  maxDuration: 45,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 500,
    maxTimeoutInMs: 10_000,
  },
  run: async (payload) => {
    // Distributed tracing Langfuse — cria span filho do orchestrator (cross-worker).
    // Mesmo padrão do tool-agent e leak-guardrail: `startObservation` com
    // `parentSpanContext` enleia este subtask ao trace raiz do orchestrator.
    const langfuseSpan = startObservation(
      'response-agent',
      {},
      {
        parentSpanContext: {
          traceId: payload.langfuseTraceId,
          spanId: payload.langfuseParentSpanId,
          traceFlags: 1,
        },
      },
    )

    const startedAt = Date.now()

    logger.info('Response agent started', {
      conversationId: payload.conversationId,
      organizationId: payload.organizationId,
      phaseTraceId: payload.phaseTraceId,
      stage: 'response_agent',
      modelId: payload.modelId,
      hasRegenerationHint: Boolean(payload.regenerationHint),
    })

    try {
    // Seção C do prompt instrui o Agent 2 a usar apenas search_knowledge e
    // search_products — as únicas tools read-only permitidas nesta fase.
    const toolContext = payload.toolContext

    const system = [
      buildResponseAgentPrompt(payload.promptBaseContext),
      payload.regenerationHint && `\n[REVISÃO INTERNA]: ${payload.regenerationHint}`,
    ]
      .filter(Boolean)
      .join('\n')

    // O dado factual do Agent 1 é injetado como mensagem `system` no final
    // do histórico para que o Agent 2 o veja com a mesma prioridade que
    // o histórico de conversa — não sobreescrevendo o system prompt principal.
    const messagesWithData = [
      ...payload.llmMessages,
      {
        role: 'system' as const,
        content: formatDataFromTools(payload.dataFromTools),
      },
    ]

    const { output, usage, steps } = await generateText({
      model: getModel(payload.modelId),
      system,
      messages: messagesWithData,
      tools: {
        search_knowledge: createSearchKnowledgeTool(toolContext),
        search_products: createSearchProductsTool(toolContext),
      },
      output: Output.object({
        schema: z.object({ customerMessage: z.string().min(1) }),
      }),
      // 5 steps permite até ~3 tool calls + 1 tool result consolidation + 1 output step.
      stopWhen: stepCountIs(5),
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'agent-responder',
        metadata: {
          phaseTraceId: payload.phaseTraceId,
          stage: 'response_agent',
        },
      },
    })

    const durationMs = Date.now() - startedAt

    metadata.set('tokensUsed', usage.totalTokens ?? 0)
    metadata.set('durationMs', durationMs)

    const knowledgeQueried = steps.some((step) =>
      step.toolCalls?.some((call) => call.toolName === 'search_knowledge'),
    )

    logger.info('Response agent completed', {
      conversationId: payload.conversationId,
      phaseTraceId: payload.phaseTraceId,
      durationMs,
      knowledgeQueried,
      totalTokens: usage.totalTokens,
      stepsUsed: steps.length,
    })

    return {
      customerMessage: output.customerMessage,
      knowledgeQueried,
      usage,
    }
    } finally {
      langfuseSpan.end()
    }
  },
})

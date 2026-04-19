import { schemaTask, logger, metadata } from '@trigger.dev/sdk/v3'
import { generateObject } from 'ai'
import { z } from 'zod'
import { startObservation } from '@langfuse/tracing'
import { getModel } from '@/_lib/ai/provider'
import { GUARDRAIL_MODEL_ID } from '@/_lib/ai/models'
import { buildLeakGuardrailPrompt } from '../lib/prompt-builders'
import { flushLangfuse, langfuseTracer } from '../lib/langfuse'

const leakGuardrailPayloadSchema = z.object({
  customerMessage: z.string(),
  context: z.object({
    toolsUsed: z.array(z.string()),
    knowledgeQueried: z.boolean(),
  }),
  conversationId: z.string().uuid(),
  organizationId: z.string().uuid(),
  phaseTraceId: z.string().uuid(),
  langfuseTraceId: z.string().length(32), // OTEL trace ID (hex) — distributed tracing Langfuse
  langfuseParentSpanId: z.string().length(16), // OTEL span ID (hex) — parent span do orchestrator
})

const leakGuardrailOutputSchema = z.object({
  hasLeak: z.boolean(),
  leakType: z
    .enum(['tool_name', 'internal_id', 'system_prompt', 'reasoning_trace'])
    .optional(),
  sanitized: z.string().optional(),
  confidence: z.number().min(0).max(1),
})

export const leakGuardrail = schemaTask({
  id: 'leak-guardrail',
  schema: leakGuardrailPayloadSchema,
  maxDuration: 30, // 30s — Gemini Flash rápido (~500ms p95) com margem para 2 retries
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 300,
    maxTimeoutInMs: 5_000,
  },
  run: async (payload) => {
    // Span filho do orchestrator via distributed tracing Langfuse — propaga contexto
    // cross-worker sem depender de propagação automática do Trigger.dev.
    const langfuseSpan = startObservation(
      'leak-guardrail',
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

    logger.info('Leak guardrail started', {
      conversationId: payload.conversationId,
      organizationId: payload.organizationId,
      phaseTraceId: payload.phaseTraceId,
      stage: 'leak_guardrail',
      toolsUsedCount: payload.context.toolsUsed.length,
      knowledgeQueried: payload.context.knowledgeQueried,
    })

    try {
      const result = await generateObject({
        model: getModel(GUARDRAIL_MODEL_ID), // modelo fixo — não usa o modelo configurado do agente
        system: buildLeakGuardrailPrompt(),
        messages: [
          {
            role: 'user',
            content: JSON.stringify({
              messageToValidate: payload.customerMessage,
              internalToolsUsed: payload.context.toolsUsed,
            }),
          },
        ],
        schema: leakGuardrailOutputSchema,
        experimental_telemetry: {
          isEnabled: true,
          tracer: langfuseTracer,
          functionId: 'agent-leak-guardrail',
          metadata: {
            phaseTraceId: payload.phaseTraceId,
            stage: 'leak_guardrail',
          },
        },
      })

      const durationMs = Date.now() - startedAt

      metadata.set('tokensUsed', result.usage.totalTokens ?? 0)
      metadata.set('durationMs', durationMs)
      metadata.set('hasLeak', result.object.hasLeak)

      logger.info('Leak guardrail completed', {
        conversationId: payload.conversationId,
        organizationId: payload.organizationId,
        phaseTraceId: payload.phaseTraceId,
        stage: 'leak_guardrail',
        hasLeak: result.object.hasLeak,
        leakType: result.object.leakType,
        confidence: result.object.confidence,
        durationMs,
        tokensUsed: result.usage.totalTokens ?? 0,
      })

      return { ...result.object, usage: result.usage }
    } finally {
      langfuseSpan.end()
      await flushLangfuse()
    }
  },
})

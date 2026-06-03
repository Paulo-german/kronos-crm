import { logger } from '@trigger.dev/sdk/v3'
import { generateObject, generateText, Output } from 'ai'
import type { ModelMessage } from 'ai'
import { z } from 'zod'
import { getModel } from '@/_lib/ai/provider'
import { langfuseTracer } from '../langfuse'
import {
  buildResponderGroundingDirective,
  sanitizeToolMessages,
} from './message-utils'
import { buildFallbackSchema } from './step-classifier'
import { LLM_TEMPERATURE, MAX_OUTPUT_TOKENS } from './constants'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface RunResponderInput {
  toolCallSteps: Array<{ toolCalls?: Array<{ toolName: string }> }> | undefined
  toolCallResponseMessages: ModelMessage[]
  llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  hasSteps: boolean
  stepIds: [string, ...string[]] | null
  modelId: string
  agentId: string
  conversationId: string
  organizationId: string
}

export interface RunResponderOutput {
  message: string
  usage: { inputTokens: number; outputTokens: number }
  fallbackClassifiedId?: string
  responderError?: string
  fallbackError?: string
  lastResortError?: string
  usedFallback: boolean
  usedLastResortFallback?: boolean
}

// ---------------------------------------------------------------------------
// Schema fixo do Responder — reutilizado no call normal e no path de erro
// ---------------------------------------------------------------------------

const responderSchema = z.object({
  message: z
    .string()
    .describe(
      'Sua resposta ao cliente. Texto natural que será enviado diretamente ao lead. ' +
        'NUNCA inclua JSONs, nomes de ferramentas, UUIDs ou qualquer metadado técnico neste campo.',
    ),
})

// ---------------------------------------------------------------------------
// runResponder — Call 2 + tool_only_fallback embutido
// Output.object no fallback funciona pq não há tools — exatamente o que motivou
// a separação Call 1 / Call 2 na v2 (tools+Output.object travam o modelo).
// ---------------------------------------------------------------------------

export async function runResponder(
  input: RunResponderInput,
): Promise<RunResponderOutput> {
  const {
    toolCallSteps,
    toolCallResponseMessages,
    llmMessages,
    hasSteps,
    stepIds,
    modelId,
    agentId,
    conversationId,
    organizationId,
  } = input

  let responderError: string | undefined
  let fallbackError: string | undefined

  // Computado uma vez — reutilizado em Call 2 e no fallback (mesmo input, mesmo resultado)
  const groundingDirective = buildResponderGroundingDirective(toolCallSteps)
  const sanitizedToolMessages = sanitizeToolMessages(toolCallResponseMessages)

  // ---- Call 2: Responder principal ----------------------------------------
  try {
    const responderResult = await generateObject({
      model: getModel(modelId),
      messages: [
        ...llmMessages,
        ...sanitizedToolMessages,
        { role: 'system', content: groundingDirective },
      ],
      schema: responderSchema,
      temperature: LLM_TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      experimental_telemetry: {
        isEnabled: true,
        tracer: langfuseTracer,
        functionId: 'chat-completion-responder',
        metadata: {
          agentId,
          conversationId,
          model: modelId,
          stage: 'responder',
        },
      },
    })

    const message = responderResult.object.message ?? ''
    if (message) {
      return {
        message,
        usage: {
          inputTokens: responderResult.usage?.inputTokens ?? 0,
          outputTokens: responderResult.usage?.outputTokens ?? 0,
        },
        usedFallback: false,
      }
    }
    // Mensagem vazia — cai no fallback abaixo
  } catch (err) {
    responderError = err instanceof Error ? err.message : String(err)
    logger.warn('Responder (Call 2) failed — falling back', {
      conversationId,
      organizationId,
      error: responderError,
    })
  }

  // ---- tool_only_fallback --------------------------------------------------
  const hasToolCalls = toolCallSteps?.some(
    (step) => step.toolCalls && step.toolCalls.length > 0,
  )

  if (!hasToolCalls) {
    // Call 2 falhou ou retornou vazio sem tool calls — tenta uma última chamada
    // simples com o contexto da conversa, sem referência a ferramentas.
    let lastResortError: string | undefined
    try {
      const lastResortResult = await generateText({
        model: getModel(modelId),
        messages: [
          ...llmMessages,
          {
            role: 'system' as const,
            content:
              'Responda a última mensagem do cliente de forma natural e direta, ' +
              'com base na conversa. Seja breve.',
          },
        ],
        temperature: LLM_TEMPERATURE,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        experimental_telemetry: {
          isEnabled: true,
          tracer: langfuseTracer,
          functionId: 'chat-completion-last-resort',
          metadata: {
            agentId,
            conversationId,
            reason: 'last_resort_fallback',
          },
        },
      })

      const message = lastResortResult.text.trim()
      return {
        message,
        usage: {
          inputTokens: lastResortResult.usage?.inputTokens ?? 0,
          outputTokens: lastResortResult.usage?.outputTokens ?? 0,
        },
        responderError,
        usedFallback: true,
        usedLastResortFallback: true,
      }
    } catch (err) {
      lastResortError = err instanceof Error ? err.message : String(err)
      logger.warn('Last-resort fallback LLM call failed', {
        conversationId,
        organizationId,
        error: lastResortError,
      })
      return {
        message: '',
        usage: { inputTokens: 0, outputTokens: 0 },
        responderError,
        lastResortError,
        usedFallback: false,
        usedLastResortFallback: true,
      }
    }
  }

  const fallbackMessages = [
    ...llmMessages,
    ...sanitizedToolMessages,
    { role: 'system' as const, content: groundingDirective },
    {
      role: 'user' as const,
      content:
        '[Sistema: as ferramentas foram executadas. Gere agora a resposta final ao cliente ' +
        'de forma natural, com base no que foi feito. Seja breve e objetivo.]',
    },
  ]

  const fallbackSchema = buildFallbackSchema(hasSteps ? stepIds : null)

  try {
    const fallbackResult = await generateText({
      model: getModel(modelId),
      messages: fallbackMessages,
      output:
        hasSteps && stepIds ? Output.object({ schema: fallbackSchema }) : undefined,
      temperature: LLM_TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      experimental_telemetry: {
        isEnabled: true,
        tracer: langfuseTracer,
        functionId: 'chat-completion-fallback',
        metadata: {
          agentId,
          conversationId,
          reason: 'tool_only_fallback',
        },
      },
    })

    const fallbackOutput = fallbackResult.output as
      | { message: string; currentStep?: string | null }
      | undefined
    const message = fallbackOutput?.message ?? fallbackResult.text ?? ''

    return {
      message,
      usage: {
        inputTokens: fallbackResult.usage?.inputTokens ?? 0,
        outputTokens: fallbackResult.usage?.outputTokens ?? 0,
      },
      fallbackClassifiedId: fallbackOutput?.currentStep ?? undefined,
      responderError,
      usedFallback: true,
    }
  } catch (err) {
    fallbackError = err instanceof Error ? err.message : String(err)
    logger.warn('Tool-only fallback LLM call failed', {
      conversationId,
      organizationId,
      error: fallbackError,
    })
    return {
      message: '',
      usage: { inputTokens: 0, outputTokens: 0 },
      responderError,
      fallbackError,
      usedFallback: true,
    }
  }
}

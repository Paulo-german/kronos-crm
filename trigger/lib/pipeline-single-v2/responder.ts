import { logger } from '@trigger.dev/sdk/v3'
import { generateText } from 'ai'
import type { ModelMessage } from 'ai'
import { getModel } from '@/_lib/ai/provider'
import { langfuseTracer } from '../langfuse'
import {
  buildResponderGroundingDirective,
  sanitizeToolMessages,
  stripLeakedToolCalls,
} from './message-utils'
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

  // ---- Call 2: Responder principal (texto puro) ---------------------------
  // Texto livre em vez de generateObject: o schema era apenas `{ message: string }`
  // (o currentStep vem do Call 3 / classifier), então não havia nada estruturado a
  // ganhar. O custo era alto: o modelo entrava em loop de repetição
  // ({"message":...}{"message":...}) e o parse all-or-nothing do generateObject
  // descartava a resposta válida da primeira cópia → NoObjectGeneratedError.
  // Texto livre não tem parse fatal; stripLeakedToolCalls cobre o vazamento de JSON
  // que o schema antes prevenia.
  try {
    const responderResult = await generateText({
      model: getModel(modelId),
      messages: [
        ...llmMessages,
        ...sanitizedToolMessages,
        { role: 'system', content: groundingDirective },
      ],
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

    const message = stripLeakedToolCalls(responderResult.text ?? '').trim()
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
    logger.info(
      'Responder failed without tool calls — attempting last-resort fallback',
      {
        conversationId,
        organizationId,
        reason: responderError ? 'responder_error' : 'empty_message',
      },
    )
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

  try {
    // Texto puro também aqui: Output.object tinha o mesmo risco de loop de
    // repetição → parse all-or-nothing → fallback que deveria salvar a resposta
    // acabava derrubando ela. O currentStep do fallback foi removido — o Call 3
    // (classifier) é a fonte do avanço de etapa.
    const fallbackResult = await generateText({
      model: getModel(modelId),
      messages: fallbackMessages,
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

    const message = stripLeakedToolCalls(fallbackResult.text ?? '').trim()

    return {
      message,
      usage: {
        inputTokens: fallbackResult.usage?.inputTokens ?? 0,
        outputTokens: fallbackResult.usage?.outputTokens ?? 0,
      },
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

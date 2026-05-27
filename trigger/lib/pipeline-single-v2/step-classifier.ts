import { logger } from '@trigger.dev/sdk/v3'
import { generateObject } from 'ai'
import type { ModelMessage } from 'ai'
import { z } from 'zod'
import { getModel } from '@/_lib/ai/provider'
import { STEP_CLASSIFIER_MODEL_ID } from '@/_lib/ai/models'
import { langfuseTracer } from '../langfuse'
import { CLASSIFIER_MAX_OUTPUT_TOKENS } from './constants'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface RunStepClassifierInput {
  steps: Array<{ id: string; order: number; name: string }>
  recentHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  contactName: string
  agentResponse: string | undefined
  agentId: string
  conversationId: string
  organizationId: string
  currentStepOrder: number
}

export interface RunStepClassifierOutput {
  classifiedId: string | undefined
  usage: { inputTokens: number; outputTokens: number }
  error?: string
}

// ---------------------------------------------------------------------------
// Helpers de prompt
// ---------------------------------------------------------------------------

interface BuildClassifierMessagesArgs {
  steps: Array<{ id: string; order: number; name: string }>
  recentHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  contactName: string
  agentResponse?: string
}

function buildClassifierMessages(
  args: BuildClassifierMessagesArgs,
): ModelMessage[] {
  const { steps, recentHistory, contactName, agentResponse } = args

  const sortedSteps = [...steps].sort((a, b) => a.order - b.order)
  const stepsBlock = sortedSteps
    .map((step, index) => `${index + 1}. ${step.name} — id: \`${step.id}\``)
    .join('\n')

  const historyMessages = recentHistory.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))

  if (agentResponse) {
    historyMessages.push({ role: 'assistant', content: agentResponse })
  }

  return [
    {
      role: 'system',
      content:
        'Sua única função é classificar em qual etapa do funil de atendimento a conversa se encontra. ' +
        'Regras: (1) a etapa só avança, nunca retrocede; (2) retorne null se nenhuma etapa se aplica claramente; ' +
        `(3) o contato se chama "${contactName}".`,
    },
    {
      role: 'system',
      content: `Etapas do funil (em ordem):\n${stepsBlock}`,
    },
    ...historyMessages,
  ] as ModelMessage[]
}

export function buildClassifierSchema(stepIds: [string, ...string[]]) {
  return z.object({
    currentStep: z
      .enum(stepIds)
      .nullable()
      .describe(
        'UUID exato da etapa atual após esta interação. Só avança, nunca retrocede. ' +
          'Retorne null se nenhuma das etapas se aplica.',
      ),
  })
}

export function buildFallbackSchema(stepIds: [string, ...string[]] | null) {
  const base = { message: z.string() }
  if (!stepIds) return z.object(base)
  return z.object({
    ...base,
    currentStep: z.enum(stepIds).nullable(),
  })
}

// ---------------------------------------------------------------------------
// runStepClassifier — Call 3 do pipeline (classificação de etapa)
// Retorna null quando o agente não tem steps configurados.
// ---------------------------------------------------------------------------

export async function runStepClassifier(
  input: RunStepClassifierInput,
): Promise<RunStepClassifierOutput | null> {
  const {
    steps,
    recentHistory,
    contactName,
    agentResponse,
    agentId,
    conversationId,
    organizationId,
    currentStepOrder,
  } = input

  if (steps.length === 0) return null

  const stepIds = steps.map((step) => step.id) as [string, ...string[]]
  const classifierSchema = buildClassifierSchema(stepIds)

  try {
    const classifierResult = await generateObject({
      model: getModel(STEP_CLASSIFIER_MODEL_ID),
      messages: buildClassifierMessages({
        steps,
        recentHistory,
        contactName,
        agentResponse,
      }),
      schema: classifierSchema,
      temperature: 0,
      maxOutputTokens: CLASSIFIER_MAX_OUTPUT_TOKENS,
      experimental_telemetry: {
        isEnabled: true,
        tracer: langfuseTracer,
        functionId: 'chat-completion-step-classifier',
        metadata: {
          agentId,
          conversationId,
          model: STEP_CLASSIFIER_MODEL_ID,
          stage: 'step-classifier',
          stepCount: steps.length,
          historySize: recentHistory.length,
        },
      },
    })
    return {
      classifiedId: classifierResult.object.currentStep ?? undefined,
      usage: {
        inputTokens: classifierResult.usage?.inputTokens ?? 0,
        outputTokens: classifierResult.usage?.outputTokens ?? 0,
      },
    }
  } catch (classifierError) {
    const errorMsg =
      classifierError instanceof Error
        ? classifierError.message
        : String(classifierError)
    logger.warn('Step classifier (Call 3) failed — keeping current step', {
      conversationId,
      organizationId,
      currentStepOrder,
      error: errorMsg,
    })
    return {
      classifiedId: undefined,
      usage: { inputTokens: 0, outputTokens: 0 },
      error: errorMsg,
    }
  }
}

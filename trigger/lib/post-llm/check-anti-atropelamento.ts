import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { calculateCreditCost } from '@/_lib/ai/pricing'
import { refundCredits } from '@/_lib/billing/credit-utils'
import { createConversationEvent } from '../create-conversation-event'
import { revalidateConversationCache } from '../revalidate-cache'
import type { InfoSubtype } from '@/_lib/conversation-events/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckAntiAtropelamentoCtx {
  conversationId: string
  organizationId: string
  agentId: string
  modelId: string
  responseText: string
  inputTokens: number
  outputTokens: number
  llmDurationMs: number
  estimatedCost: number
  agentTriggeredHandOff: boolean
}

export interface CheckAntiAtropelamentoResult {
  paused: boolean
  skipReason?: string
  actualCost?: number
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Re-consulta conversation.aiPaused após o LLM terminar para detectar
 * pause manual do operador que chegou DURANTE a geração (anti-atropelamento).
 *
 * Se pausada: salva a resposta no banco (auditoria) mas NÃO envia no WhatsApp,
 * refunda créditos e cria evento AI_PAUSED_DURING_GENERATION na timeline.
 *
 * Pula a re-query quando agentTriggeredHandOff=true — o próprio agente disparou
 * hand_off nesta execução, então aiPaused estará true por design; não podemos
 * bloquear o envio da mensagem final do hand-off.
 */
export async function checkAntiAtropelamento(
  ctx: CheckAntiAtropelamentoCtx,
): Promise<CheckAntiAtropelamentoResult> {
  const {
    conversationId,
    organizationId,
    agentId,
    modelId,
    responseText,
    inputTokens,
    outputTokens,
    llmDurationMs,
    estimatedCost,
    agentTriggeredHandOff,
  } = ctx

  // Hand-off disparado pelo próprio agente → pular re-query
  if (agentTriggeredHandOff) {
    return { paused: false }
  }

  const freshConversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { aiPaused: true },
  })

  if (!freshConversation?.aiPaused) {
    return { paused: false }
  }

  // Salva resposta no banco para auditoria, mas sem enviar
  await db.message.create({
    data: {
      conversationId,
      role: 'assistant',
      content: responseText,
      inputTokens: inputTokens || null,
      outputTokens: outputTokens || null,
      metadata: {
        model: modelId,
        skippedReason: 'ai_paused_during_generation',
        llmDurationMs,
      },
    },
  })

  // Calcula custo real e refunda a diferença (apenas se houve sobra)
  const totalTokens = inputTokens + outputTokens
  const actualCost = calculateCreditCost(modelId, totalTokens)
  const refundAmount = estimatedCost - actualCost

  if (refundAmount > 0) {
    await refundCredits(
      organizationId,
      refundAmount,
      'Refund — IA pausada durante geração',
      {
        agentId,
        conversationId,
        model: modelId,
        estimatedCost,
        actualCost,
      },
    )
  }

  await createConversationEvent({
    conversationId,
    type: 'INFO',
    content: 'IA foi pausada durante geração. Resposta salva mas não enviada.',
    metadata: {
      subtype: 'AI_PAUSED_DURING_GENERATION' satisfies InfoSubtype,
    },
  })

  await revalidateConversationCache(conversationId, organizationId)

  logger.info('Anti-atropelamento: IA pausada durante geração', {
    conversationId,
    organizationId,
    estimatedCost,
    actualCost,
    refundAmount,
  })

  return {
    paused: true,
    skipReason: 'ai_paused_during_generation',
    actualCost,
  }
}

import { logger } from '@trigger.dev/sdk/v3'
import { calculateCreditCost } from '@/_lib/ai/pricing'
import { debitCredits, refundCredits } from '@/_lib/billing/credit-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettleReason =
  | 'completed'
  | 'llm_error'
  | 'empty_response'
  | 'ai_paused_during_generation'
  | 'guard_escalated'
  | 'fallback_completed'

// Shape exigido por debitCredits/refundCredits — metadata JSONB serializável.
type CreditMetadata = Record<string, string | number | boolean | null | undefined>

interface SettleCreditsInput {
  organizationId: string
  estimatedCost: number
  modelId: string
  /**
   * null quando não há usage disponível (ex: erro antes de receber tokens do LLM).
   * Resulta em refund completo do estimatedCost.
   */
  actualUsage: {
    inputTokens: number
    outputTokens: number
  } | null
  reason: SettleReason
  metadata: CreditMetadata & {
    agentId: string
    conversationId: string
    phaseTraceId?: string
  }
}

interface SettleCreditsResult {
  type: 'refund' | 'extra_debit' | 'exact' | 'no_op'
  actualCost: number
  /** Positivo quando refund, negativo quando debit extra */
  delta: number
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Acerta o saldo de créditos após execução do LLM.
 *
 * Consolida os 4 pontos de ajuste que existem inline na single-v2:
 * main path, llm_error, empty_response e ai_paused_during_generation.
 * A semântica é idêntica — apenas centralizada aqui para reuso entre tracks.
 */
export async function settleCredits(
  input: SettleCreditsInput,
): Promise<SettleCreditsResult> {
  const { organizationId, estimatedCost, modelId, actualUsage, reason, metadata } = input
  const { conversationId } = metadata

  // Refund completo quando não há usage (erro antes de qualquer geração de tokens)
  if (actualUsage === null) {
    await refundCredits(
      organizationId,
      estimatedCost,
      `Refund — ${reason}`,
      {
        ...metadata,
        estimatedCost,
        reason,
      },
    )

    logger.info('credits settled', {
      conversationId,
      organizationId,
      reason,
      type: 'refund',
      delta: estimatedCost,
      estimatedCost,
      actualCost: 0,
    })

    return { type: 'refund', actualCost: 0, delta: estimatedCost }
  }

  const totalTokens = actualUsage.inputTokens + actualUsage.outputTokens
  const actualCost = calculateCreditCost(modelId, totalTokens)
  const delta = estimatedCost - actualCost

  if (delta > 0) {
    // Custo real menor que estimado — devolver diferença
    await refundCredits(
      organizationId,
      delta,
      'Ajuste pós-LLM — custo real menor que estimado',
      {
        ...metadata,
        estimatedCost,
        actualCost,
        totalTokens,
        reason,
      },
    )

    logger.info('credits settled', {
      conversationId,
      organizationId,
      reason,
      type: 'refund',
      delta,
      estimatedCost,
      actualCost,
    })

    return { type: 'refund', actualCost, delta }
  }

  if (delta < 0) {
    // Custo real maior que estimado (raro) — cobrar diferença adicional
    await debitCredits(
      organizationId,
      -delta,
      'Ajuste pós-LLM — custo real maior que estimado',
      {
        ...metadata,
        estimatedCost,
        actualCost,
        totalTokens,
        reason,
        type: 'adjustment',
      },
      false, // não incrementar totalMessagesUsed — já foi contado no débito otimista
    )

    logger.info('credits settled', {
      conversationId,
      organizationId,
      reason,
      type: 'extra_debit',
      delta,
      estimatedCost,
      actualCost,
    })

    return { type: 'extra_debit', actualCost, delta }
  }

  // Custo exato — nenhum ajuste necessário
  logger.info('credits settled', {
    conversationId,
    organizationId,
    reason,
    type: 'exact',
    delta: 0,
    estimatedCost,
    actualCost,
  })

  return { type: 'exact', actualCost, delta: 0 }
}

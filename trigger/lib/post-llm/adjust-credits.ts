import { logger } from '@trigger.dev/sdk/v3'
import { calculateCreditCost } from '@/_lib/ai/pricing'
import { refundCredits, debitCredits } from '@/_lib/billing/credit-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdjustCreditsCtx {
  organizationId: string
  modelId: string
  estimatedCost: number
  actualTotalTokens: number
  context: {
    agentId: string
    conversationId: string
    phaseTraceId: string
  }
}

export interface AdjustCreditsResult {
  actualCost: number
  refunded: number
  charged: number
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Reconcilia créditos após o LLM: compara custo real (tokens efetivos × tabela
 * do modelId) com o estimatedCost cobrado de forma otimista antes da chamada.
 *
 * - Refund se actualCost < estimatedCost (caso normal — estimativa é conservadora).
 * - Debit extra se actualCost > estimatedCost (raro — ocorre com retry do Agent 2
 *   ou Agent 3 na mesma execução que ultrapassou o máximo estimado).
 * - No-op se iguais.
 *
 * Propaga erro (throw) — impacto financeiro direto, falha deve escalar para
 * o catch do orchestrator acionar refund completo e rethrow.
 */
export async function adjustCredits(
  ctx: AdjustCreditsCtx,
): Promise<AdjustCreditsResult> {
  const { organizationId, modelId, estimatedCost, actualTotalTokens, context } = ctx

  const actualCost = calculateCreditCost(modelId, actualTotalTokens)
  const creditDiff = estimatedCost - actualCost

  if (creditDiff > 0) {
    // Custo real menor que estimado — devolver a diferença
    await refundCredits(
      organizationId,
      creditDiff,
      'Ajuste pós-LLM — custo real menor que estimado',
      {
        agentId: context.agentId,
        conversationId: context.conversationId,
        phaseTraceId: context.phaseTraceId,
        model: modelId,
        estimatedCost,
        actualCost,
        actualTotalTokens,
      },
    )

    logger.info('Ajuste de créditos: refund', {
      organizationId,
      creditDiff,
      estimatedCost,
      actualCost,
      actualTotalTokens,
    })

    return { actualCost, refunded: creditDiff, charged: 0 }
  }

  if (creditDiff < 0) {
    // Custo real maior que estimado — cobrar a diferença
    const extraAmount = -creditDiff
    const debited = await debitCredits(
      organizationId,
      extraAmount,
      'Ajuste pós-LLM — custo real maior que estimado',
      {
        agentId: context.agentId,
        conversationId: context.conversationId,
        phaseTraceId: context.phaseTraceId,
        model: modelId,
        estimatedCost,
        actualCost,
        actualTotalTokens,
        type: 'adjustment',
      },
      false, // não incrementa totalMessagesUsed — não é nova mensagem
    )

    logger.info(debited ? 'Ajuste de créditos: debit extra' : 'Ajuste de créditos: debit extra ignorado (saldo insuficiente)', {
      organizationId,
      extraAmount,
      estimatedCost,
      actualCost,
      actualTotalTokens,
      debited,
    })

    return { actualCost, refunded: 0, charged: debited ? extraAmount : 0 }
  }

  // Custo exato — sem ajuste
  return { actualCost, refunded: 0, charged: 0 }
}

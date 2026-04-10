import { getTokensPerCreditForModel } from './models'

/**
 * Calcula custo em créditos a partir de tokens reais consumidos.
 * Fórmula: ceil(totalTokens / tokensPerCredit)
 * Mínimo: 1 crédito por chamada.
 */
export function calculateCreditCost(modelId: string, totalTokens: number): number {
  if (totalTokens <= 0) return 1
  const tokensPerCredit = getTokensPerCreditForModel(modelId)
  return Math.max(1, Math.ceil(totalTokens / tokensPerCredit))
}

/**
 * Estima custo máximo antes da chamada LLM (para débito otimista).
 * Usa estimatedInputTokens + maxOutputTokens como pior caso.
 */
export function estimateMaxCost(
  modelId: string,
  estimatedInputTokens: number,
  maxOutputTokens: number,
): number {
  return calculateCreditCost(modelId, estimatedInputTokens + maxOutputTokens)
}

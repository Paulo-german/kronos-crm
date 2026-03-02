// Tokens por crédito por modelo.
// Maior = modelo mais barato = mais tokens por crédito.
// Calibração: Claude Sonnet 4 (default) com ~1900 tokens ≈ 10 créditos.
const MODEL_TOKENS_PER_CREDIT: Record<string, number> = {
  'google/gemini-2.5-flash': 4500,
  'openai/gpt-4.1-mini': 1700,
  'google/gemini-2.5-pro': 350,
  'openai/gpt-5.2': 350,
  'anthropic/claude-sonnet-4': 200,
}

const DEFAULT_TOKENS_PER_CREDIT = 200

function getTokensPerCredit(modelId: string): number {
  return MODEL_TOKENS_PER_CREDIT[modelId] ?? DEFAULT_TOKENS_PER_CREDIT
}

/**
 * Calcula custo em créditos a partir de tokens reais consumidos.
 * Fórmula: ceil(totalTokens / tokensPerCredit)
 * Mínimo: 1 crédito por chamada.
 */
export function calculateCreditCost(
  modelId: string,
  totalTokens: number,
): number {
  if (totalTokens <= 0) return 1
  const tokensPerCredit = getTokensPerCredit(modelId)
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
  const worstCaseTokens = estimatedInputTokens + maxOutputTokens
  return calculateCreditCost(modelId, worstCaseTokens)
}

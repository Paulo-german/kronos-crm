import type { AiModel } from './models'
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

// Whisper-1 cobra $0.006/min (OpenAI), billing rounded por segundo.
// Calibrado para ~4 créditos/minuto, consistente com a ordem de grandeza
// das outras chamadas AI do sistema (ver calculateCreditCost para gpt-4o-mini).
// Se no futuro quisermos reprecificar, ajustar apenas esta constante.
const WHISPER_CREDITS_PER_MINUTE = 4

/**
 * Calcula custo em créditos para transcrição de áudio via Whisper-1.
 * Custo mínimo de 1 crédito independente da duração (áudios muito curtos).
 */
export function calculateAudioCreditCost(durationSeconds: number): number {
  if (durationSeconds <= 0) return 1
  return Math.max(1, Math.ceil((durationSeconds / 60) * WHISPER_CREDITS_PER_MINUTE))
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

/**
 * Estima créditos consumidos por mensagem para exibição no picker de modelos.
 * Baseline de 8.500 tokens — real observado é ~5.900, mas precificamos pelo teto
 * do range esperado (7k–9k) para evitar subcobrança em conversas mais longas.
 * Usa a mesma fórmula do billing real: ceil(totalTokens / tokensPerCredit).
 */
export function formatAvgCostPerMessage(model: AiModel, totalTokens = 8_500): string {
  const credits = Math.max(1, Math.ceil(totalTokens / model.tokensPerCredit))
  return `~${credits} crédito${credits === 1 ? '' : 's'}/msg`
}

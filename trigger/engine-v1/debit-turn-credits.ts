import type { ModelMessage } from 'ai'
import { estimateMaxCost } from '@/_lib/ai/pricing'
import { debitCredits } from '@/_lib/billing/credit-utils'
import { RESPONDER_MAX_OUTPUT_TOKENS } from './constants'

interface DebitTurnCreditsInput {
  organizationId: string
  agentId: string
  conversationId: string
  modelId: string
  promptTokens: number // prompt.estimatedTokens (system prompt já estimado)
  messages: ModelMessage[]
}

// Débito OTIMISTA: garante saldo ANTES de chamar o LLM (evita corrida de duas
// mensagens gastando o mesmo saldo). `debited: false` se não há saldo → o turno para.
// Devolve o `estimatedCost` pro persist reconciliar com o custo real (as 2 chamadas).
export async function debitTurnCredits(
  input: DebitTurnCreditsInput,
): Promise<{ debited: boolean; estimatedCost: number }> {
  const estimatedInputTokens =
    input.promptTokens + estimateMessagesTokens(input.messages)
  const estimatedCost = estimateMaxCost(
    input.modelId,
    estimatedInputTokens,
    RESPONDER_MAX_OUTPUT_TOKENS,
  )

  const debited = await debitCredits(
    input.organizationId,
    estimatedCost,
    'Débito otimista — agente (engine-v1)',
    {
      agentId: input.agentId,
      conversationId: input.conversationId,
      model: input.modelId,
      estimatedInputTokens,
      estimatedCost,
      type: 'optimistic',
    },
  )

  return { debited, estimatedCost }
}

// Estimativa grosseira (~4 chars/token) do input das mensagens. O custo real
// (tokenização do provider) é reconciliado no persist.
function estimateMessagesTokens(messages: ModelMessage[]): number {
  const chars = messages.reduce((sum, message) => {
    const { content } = message
    return (
      sum +
      (typeof content === 'string'
        ? content.length
        : JSON.stringify(content).length)
    )
  }, 0)
  return Math.ceil(chars / 4)
}

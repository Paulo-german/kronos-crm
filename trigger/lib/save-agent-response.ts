import { db } from '@/_lib/prisma'
import { parseProviderError, type ProviderDeliveryError } from '@/_lib/whatsapp/parse-provider-error'
import { AUTO_REOPEN_FIELDS } from '@/_lib/conversation/auto-reopen'

interface SaveAgentResponseBase {
  conversationId: string
  textToSend: string
  inputTokens: number | null
  outputTokens: number | null
  modelId: string
  llmDurationMs: number
}

/**
 * Salva a resposta do agente no banco com deliveryStatus 'sent' e atualiza
 * lastMessageRole na conversa. Chamada após confirmação de envio bem-sucedido.
 */
export async function saveAgentResponseSent(
  params: SaveAgentResponseBase & { providerMessageId: string | null },
): Promise<void> {
  const {
    conversationId,
    textToSend,
    inputTokens,
    outputTokens,
    modelId,
    llmDurationMs,
    providerMessageId,
  } = params

  // message.create e conversation.update são independentes — paralelizar
  await Promise.all([
    db.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: textToSend,
        inputTokens,
        outputTokens,
        providerMessageId: providerMessageId ?? undefined,
        deliveryStatus: 'sent',
        metadata: { model: modelId, llmDurationMs },
      },
    }),
    // Denormalizar role da última mensagem para viabilizar filtro "não respondidos"
    db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageRole: 'assistant', ...AUTO_REOPEN_FIELDS },
    }),
  ])
}

/**
 * Salva a resposta do agente no banco com deliveryStatus 'failed' e detalhes
 * do erro de envio. Retorna o erro parseado para que o chamador possa usar
 * a mensagem amigável no evento de auditoria sem chamar parseProviderError duas vezes.
 */
export async function saveAgentResponseFailed(
  params: SaveAgentResponseBase & { error: unknown },
): Promise<ProviderDeliveryError> {
  const {
    conversationId,
    textToSend,
    inputTokens,
    outputTokens,
    modelId,
    llmDurationMs,
    error,
  } = params

  const parsed = parseProviderError(error)

  // message.create e conversation.update são independentes — paralelizar
  // Mesmo em falha de envio, lastMessageRole 'assistant' evita re-trigger imediato
  await Promise.all([
    db.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: textToSend,
        inputTokens,
        outputTokens,
        deliveryStatus: 'failed',
        metadata: { model: modelId, llmDurationMs, deliveryError: parsed },
      },
    }),
    db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageRole: 'assistant', ...AUTO_REOPEN_FIELDS },
    }),
  ])

  return parsed
}

import { db } from '@/_lib/prisma'
import { prefixAttendantName } from '@/_lib/inbox/prefix-attendant-name'
import { AUTO_REOPEN_FIELDS } from '@/_lib/conversation/auto-reopen'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SaveAssistantMessageCtx {
  conversationId: string
  organizationId: string
  agentId: string
  modelId: string
  text: string
  inputTokens: number
  outputTokens: number
  llmDurationMs: number
  agentName: string | null
  showAttendantName: boolean
}

export interface SaveAssistantMessageResult {
  messageId: string
  textSent: string
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Persiste a mensagem do assistente e desnormaliza lastMessageRole na conversa.
 *
 * O prefix do nome do atendente é aplicado aqui (uma só vez) antes de salvar —
 * o textSent retornado já está com prefix e deve ser usado para envio WhatsApp,
 * evitando dupla aplicação.
 *
 * AUTO_REOPEN_FIELDS reabre conversas RESOLVED quando o agente responde,
 * mantendo o status OPEN sem condicional extra.
 *
 * Propaga erro (throw) pois sem mensagem persistida o histórico ficaria
 * inconsistente e o envio WhatsApp não pode prosseguir.
 */
export async function saveAssistantMessage(
  ctx: SaveAssistantMessageCtx,
): Promise<SaveAssistantMessageResult> {
  const {
    conversationId,
    modelId,
    text,
    inputTokens,
    outputTokens,
    llmDurationMs,
    agentName,
    showAttendantName,
  } = ctx

  const textSent = prefixAttendantName(text, agentName, showAttendantName)

  const message = await db.message.create({
    data: {
      conversationId,
      role: 'assistant',
      content: textSent,
      inputTokens: inputTokens || null,
      outputTokens: outputTokens || null,
      metadata: {
        model: modelId,
        llmDurationMs,
      },
    },
    select: { id: true },
  })

  // Denormaliza role da última mensagem para viabilizar filtro "não respondidos"
  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageRole: 'assistant', ...AUTO_REOPEN_FIELDS },
  })

  return { messageId: message.id, textSent }
}

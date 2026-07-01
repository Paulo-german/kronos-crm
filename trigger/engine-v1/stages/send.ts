import { AbortTaskRunError } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { createConversationEvent } from '../../lib/create-conversation-event'
import { emitAgentStatus } from '../../lib/emit-agent-status'
import { extractAndSendInlineMedia } from '../../lib/extract-and-send-inline-media'
import {
  saveAgentResponseFailed,
  saveAgentResponseSent,
} from '../../lib/save-agent-response'
import type { Stage } from '../types'

// Credenciais do inbox necessárias pra resolver o provider de envio.
const INBOX_CREDENTIALS_SELECT = {
  connectionType: true,
  channel: true,
  evolutionInstanceName: true,
  evolutionApiUrl: true,
  evolutionApiKey: true,
  metaPhoneNumberId: true,
  metaAccessToken: true,
  metaIgUserId: true,
  zapiInstanceId: true,
  zapiToken: true,
  zapiClientToken: true,
} as const

// Entrega a resposta e registra a mensagem (sent/failed). ÚLTIMO estágio: créditos e
// estado já foram reconciliados no persist. Erro de ENVIO (ex: WhatsApp desconectado)
// NÃO é bug do sistema e NÃO faz retry — a resposta já foi gerada e paga. Salva a
// mensagem como 'failed', avisa na interface (evento SEND_FAILED) e aborta sem retry
// (AbortTaskRunError). O user reenvia manualmente (retry automático = feature futura).
export const send: Stage = async (state) => {
  const { ctx, responseText, usage, modelId, handedOff, llmDurationMs } = state
  const text = responseText ?? ''

  // Double-check aiPaused + credenciais do inbox numa query só. Se a IA foi pausada
  // durante a geração e NÃO foi handoff (a despedida deve ir), suprime o envio.
  const conversation = await db.conversation.findUnique({
    where: { id: ctx.conversationId },
    select: { aiPaused: true, inbox: { select: INBOX_CREDENTIALS_SELECT } },
  })

  if (conversation?.aiPaused && !handedOff) {
    return {
      outcome: { type: 'skipped', reason: 'ai_paused_during_generation' },
    }
  }

  const inbox = conversation?.inbox
  if (!inbox) {
    throw new Error('send: conversa sem inbox — não há como enviar.')
  }

  const base = {
    conversationId: ctx.conversationId,
    textToSend: text,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    modelId: modelId ?? 'unknown',
    llmDurationMs: llmDurationMs ?? 0,
  }

  try {
    const result = await extractAndSendInlineMedia(text, {
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      remoteJid: ctx.message.remoteJid,
      inboxProvider: inbox,
      credentials: inbox,
    })
    await saveAgentResponseSent({
      ...base,
      providerMessageId: result.lastSentId,
    })
    return {}
  } catch (sendError) {
    const parsed = await saveAgentResponseFailed({ ...base, error: sendError })
    await createConversationEvent({
      conversationId: ctx.conversationId,
      type: 'PROCESSING_ERROR',
      content: parsed.userMessage ?? 'Falha na entrega da mensagem.',
      metadata: { subtype: 'SEND_FAILED' },
    })
    await emitAgentStatus({
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      state: 'idle',
      agentName: 'Agente',
      terminalReason: 'failed',
    })
    throw new AbortTaskRunError(
      `Falha no envio (sem retry): ${
        sendError instanceof Error ? sendError.message : String(sendError)
      }`,
    )
  }
}

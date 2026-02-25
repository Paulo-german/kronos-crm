import { task, logger } from '@trigger.dev/sdk/v3'
import { generateText } from 'ai'
import { getModel } from '@/_lib/ai'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { checkBalance, debitCredits } from '@/_lib/billing/credit-utils'
import { sendWhatsAppMessage, sendPresence } from '@/_lib/evolution/send-message'
import { buildSystemPrompt } from './build-system-prompt'
import type { NormalizedWhatsAppMessage } from '@/_lib/evolution/types'

const NO_CREDITS_MESSAGE =
  'Desculpe, no momento não consigo responder pois os créditos de IA da empresa foram esgotados. Por favor, entre em contato com o administrador.'

const MESSAGE_HISTORY_LIMIT = 50
const SUMMARIZATION_THRESHOLD = 12
const KEEP_RECENT_MESSAGES = 3
const SUMMARIZATION_MODEL = 'openai/gpt-4o-mini'

export interface ProcessAgentMessagePayload {
  message: NormalizedWhatsAppMessage
  agentId: string
  conversationId: string
  organizationId: string
  debounceTimestamp: number
}

export const processAgentMessage = task({
  id: 'process-agent-message',
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: ProcessAgentMessagePayload) => {
    const {
      message,
      agentId,
      conversationId,
      organizationId,
      debounceTimestamp,
    } = payload

    const taskStartMs = Date.now()

    // -----------------------------------------------------------------------
    // 1. Debounce check
    // -----------------------------------------------------------------------
    try {
      const currentTimestamp = await redis.get(`debounce:${conversationId}`)
      if (currentTimestamp && currentTimestamp !== String(debounceTimestamp)) {
        logger.info('Debounce: newer message exists, skipping', {
          conversationId,
          myTimestamp: debounceTimestamp,
          currentTimestamp,
        })
        return { skipped: true, reason: 'debounce' }
      }
    } catch (error) {
      logger.warn('Redis debounce check failed, continuing', { error })
    }

    // -----------------------------------------------------------------------
    // 2. Credit check
    // -----------------------------------------------------------------------
    const balance = await checkBalance(organizationId)

    if (balance.available <= 0) {
      logger.warn('No credits available', { organizationId, balance })

      await sendWhatsAppMessage(
        message.instanceName,
        message.remoteJid,
        NO_CREDITS_MESSAGE,
      )

      return { skipped: true, reason: 'no_credits' }
    }

    // -----------------------------------------------------------------------
    // 3. Context loading — prompt dinâmico + histórico
    // -----------------------------------------------------------------------
    const [promptContext, messageHistory] = await Promise.all([
      buildSystemPrompt(agentId, conversationId),
      db.agentMessage.findMany({
        where: {
          conversationId,
          isArchived: false,
        },
        orderBy: { createdAt: 'asc' },
        take: MESSAGE_HISTORY_LIMIT,
        select: {
          role: true,
          content: true,
        },
      }),
    ])

    // -----------------------------------------------------------------------
    // 4. Build LLM messages (prompt dinâmico + summary + history)
    // -----------------------------------------------------------------------
    const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []

    llmMessages.push({ role: 'system', content: promptContext.systemPrompt })

    if (promptContext.summary) {
      llmMessages.push({
        role: 'system',
        content: `Resumo da conversa anterior:\n${promptContext.summary}`,
      })
    }

    for (const msg of messageHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        llmMessages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    // -----------------------------------------------------------------------
    // 5. Typing presence — "digitando..." antes do LLM
    // -----------------------------------------------------------------------
    await sendPresence(message.instanceName, message.remoteJid, 'composing')

    // -----------------------------------------------------------------------
    // 6. Call LLM (com logging de duração)
    // -----------------------------------------------------------------------
    logger.info('Calling LLM', {
      model: promptContext.modelId,
      messageCount: llmMessages.length,
      systemPromptEstimatedTokens: promptContext.estimatedTokens,
      historyMessageCount: messageHistory.length,
      contactName: promptContext.contactName,
      conversationId,
    })

    const llmStartMs = Date.now()

    const result = await generateText({
      model: getModel(promptContext.modelId),
      messages: llmMessages,
      maxOutputTokens: 1024,
    })

    const llmDurationMs = Date.now() - llmStartMs

    const responseText = result.text

    if (!responseText) {
      logger.warn('LLM returned empty response', { conversationId, llmDurationMs })
      return { skipped: true, reason: 'empty_response' }
    }

    // -----------------------------------------------------------------------
    // 7. Double-check anti-atropelamento — re-query aiPaused
    // -----------------------------------------------------------------------
    const freshConversation = await db.agentConversation.findUnique({
      where: { id: conversationId },
      select: { aiPaused: true },
    })

    if (freshConversation?.aiPaused) {
      // Salva resposta no banco mas NÃO envia no WhatsApp
      await db.agentMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: responseText,
          inputTokens: result.usage?.inputTokens ?? null,
          outputTokens: result.usage?.outputTokens ?? null,
          metadata: {
            model: promptContext.modelId,
            skippedReason: 'ai_paused_during_generation',
            llmDurationMs,
          },
        },
      })

      logger.info('AI paused during generation — response saved but NOT sent', {
        conversationId,
        llmDurationMs,
      })

      return { skipped: true, reason: 'ai_paused_during_generation' }
    }

    // -----------------------------------------------------------------------
    // 8. Salvar resposta no banco
    // -----------------------------------------------------------------------
    await db.agentMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: responseText,
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        metadata: {
          model: promptContext.modelId,
          llmDurationMs,
        },
      },
    })

    // -----------------------------------------------------------------------
    // 9. Debit credits
    // -----------------------------------------------------------------------
    const debited = await debitCredits(organizationId, 1, 'Mensagem processada pelo agente', {
      agentId,
      conversationId,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      model: promptContext.modelId,
    })

    if (!debited) {
      logger.warn('Failed to debit credits (insufficient balance after race)', {
        organizationId,
      })
    }

    // -----------------------------------------------------------------------
    // 10. Send WhatsApp message
    // -----------------------------------------------------------------------
    await sendWhatsAppMessage(
      message.instanceName,
      message.remoteJid,
      responseText,
    )

    // -----------------------------------------------------------------------
    // 11. Memory compression — se >= threshold msgs, summarizar e arquivar
    // -----------------------------------------------------------------------
    await compressMemory(conversationId)

    // -----------------------------------------------------------------------
    // 12. Logging final
    // -----------------------------------------------------------------------
    const totalDurationMs = Date.now() - taskStartMs

    logger.info('Message processed successfully', {
      conversationId,
      agentId,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      llmDurationMs,
      totalDurationMs,
      systemPromptEstimatedTokens: promptContext.estimatedTokens,
      historyMessageCount: messageHistory.length,
    })

    return { success: true }
  },
})

// ---------------------------------------------------------------------------
// Memory Compression
// ---------------------------------------------------------------------------

async function compressMemory(conversationId: string): Promise<void> {
  try {
    const totalMessages = await db.agentMessage.count({
      where: { conversationId, isArchived: false },
    })

    if (totalMessages < SUMMARIZATION_THRESHOLD) return

    // Buscar todas as mensagens ativas ordenadas por data
    const allMessages = await db.agentMessage.findMany({
      where: { conversationId, isArchived: false },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
      },
    })

    // Separar: arquivar tudo exceto as últimas N
    const toArchiveCount = allMessages.length - KEEP_RECENT_MESSAGES
    if (toArchiveCount <= 0) return

    const messagesToArchive = allMessages.slice(0, toArchiveCount)

    // Montar transcript para sumarização
    const transcript = messagesToArchive
      .map((msg) => `[${msg.role}]: ${msg.content}`)
      .join('\n')

    // Gerar resumo via LLM
    const summaryResult = await generateText({
      model: getModel(SUMMARIZATION_MODEL),
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente especializado em gerar resumos densos de conversas. ' +
            'Resuma a conversa abaixo mantendo: pontos-chave discutidos, decisões tomadas, ' +
            'informações do cliente mencionadas e próximos passos combinados. ' +
            'Seja conciso mas não perca informações importantes. Responda em português.',
        },
        {
          role: 'user',
          content: `Resuma esta conversa:\n\n${transcript}`,
        },
      ],
      maxOutputTokens: 512,
    })

    const summary = summaryResult.text

    if (!summary) {
      logger.warn('Summarization returned empty result', { conversationId })
      return
    }

    // Transaction: salvar summary + arquivar mensagens antigas
    const archiveIds = messagesToArchive.map((msg) => msg.id)

    await db.$transaction([
      db.agentConversation.update({
        where: { id: conversationId },
        data: { summary },
      }),
      db.agentMessage.updateMany({
        where: { id: { in: archiveIds } },
        data: { isArchived: true },
      }),
    ])

    logger.info('Memory compressed', {
      conversationId,
      archivedCount: archiveIds.length,
      summaryLength: summary.length,
    })
  } catch (error) {
    // Non-fatal: falha na compressão não bloqueia o fluxo
    logger.warn('Memory compression failed', { conversationId, error })
  }
}

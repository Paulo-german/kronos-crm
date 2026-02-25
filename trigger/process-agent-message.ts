import { task, logger } from '@trigger.dev/sdk/v3'
import { generateText } from 'ai'
import { getModel } from '@/_lib/ai'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { checkBalance, debitCredits } from '@/_lib/billing/credit-utils'
import { sendWhatsAppMessage } from '@/_lib/evolution/send-message'
import type { NormalizedWhatsAppMessage } from '@/_lib/evolution/types'

const NO_CREDITS_MESSAGE =
  'Desculpe, no momento não consigo responder pois os créditos de IA da empresa foram esgotados. Por favor, entre em contato com o administrador.'

const MESSAGE_HISTORY_LIMIT = 50

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

    // -----------------------------------------------------------------------
    // 1. Debounce check — se uma mensagem mais recente já resetou o timer,
    //    este task deve sair silenciosamente (o task mais recente vai processar)
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
      // Redis failure = prosseguir (melhor duplicar resposta do que não responder)
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
    // 3. Carregar contexto — Agent + histórico de mensagens + conversa
    // -----------------------------------------------------------------------
    const agent = await db.agent.findUniqueOrThrow({
      where: { id: agentId },
      select: {
        systemPrompt: true,
        modelId: true,
      },
    })

    const conversation = await db.agentConversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: {
        summary: true,
        currentStepOrder: true,
      },
    })

    const messageHistory = await db.agentMessage.findMany({
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
    })

    // -----------------------------------------------------------------------
    // 4. Montar mensagens para a LLM
    // -----------------------------------------------------------------------
    const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []

    // System prompt do agente
    llmMessages.push({ role: 'system', content: agent.systemPrompt })

    // Resumo da conversa anterior (se houver)
    if (conversation.summary) {
      llmMessages.push({
        role: 'system',
        content: `Resumo da conversa anterior:\n${conversation.summary}`,
      })
    }

    // Histórico de mensagens (user + assistant)
    for (const msg of messageHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        llmMessages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    // -----------------------------------------------------------------------
    // 5. Chamar LLM via Vercel AI SDK
    // -----------------------------------------------------------------------
    logger.info('Calling LLM', {
      model: agent.modelId,
      messageCount: llmMessages.length,
      conversationId,
    })

    const result = await generateText({
      model: getModel(agent.modelId),
      messages: llmMessages,
      maxTokens: 1024,
    })

    const responseText = result.text

    if (!responseText) {
      logger.warn('LLM returned empty response', { conversationId })
      return { skipped: true, reason: 'empty_response' }
    }

    // -----------------------------------------------------------------------
    // 6. Salvar resposta no banco
    // -----------------------------------------------------------------------
    await db.agentMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: responseText,
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        metadata: {
          model: agent.modelId,
        },
      },
    })

    // -----------------------------------------------------------------------
    // 7. Debitar créditos
    // -----------------------------------------------------------------------
    const debited = await debitCredits(organizationId, 1, 'Mensagem processada pelo agente', {
      agentId,
      conversationId,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      model: agent.modelId,
    })

    if (!debited) {
      logger.warn('Failed to debit credits (insufficient balance after race)', {
        organizationId,
      })
    }

    // -----------------------------------------------------------------------
    // 8. Enviar resposta no WhatsApp
    // -----------------------------------------------------------------------
    await sendWhatsAppMessage(
      message.instanceName,
      message.remoteJid,
      responseText,
    )

    logger.info('Message processed successfully', {
      conversationId,
      agentId,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    })

    return { success: true }
  },
})

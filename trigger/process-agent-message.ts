import { task, logger } from '@trigger.dev/sdk/v3'
import { generateText, stepCountIs } from 'ai'
import { observe, updateActiveTrace } from '@langfuse/tracing'
import { getModel } from '@/_lib/ai'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { checkBalance, debitCredits } from '@/_lib/billing/credit-utils'
import { sendWhatsAppMessage, sendPresence } from '@/_lib/evolution/send-message'
import { buildSystemPrompt } from './build-system-prompt'
import { buildToolSet } from './tools'
import { langfuseTracer, flushLangfuse } from './lib/langfuse'
import { transcribeAudio } from './utils/transcribe-audio'
import { downloadAndStoreMedia } from './utils/download-and-store-media'
import type { ToolContext } from './tools/types'
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
    return observe(async () => {
    const {
      message,
      agentId,
      conversationId,
      organizationId,
      debounceTimestamp,
    } = payload

    updateActiveTrace({
      sessionId: conversationId,
      userId: organizationId,
      tags: ['whatsapp', 'agent'],
      metadata: { agentId, messageType: message.type },
    })

    const taskStartMs = Date.now()

    try {
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
    // 2b. Se áudio, transcrever com Whisper
    // -----------------------------------------------------------------------
    let messageText = message.text
    if (message.type === 'audio' && message.media) {
      logger.info('Transcribing audio', {
        instanceName: message.instanceName,
        messageId: message.messageId,
        seconds: message.media.seconds,
      })

      const transcription = await transcribeAudio(
        message.instanceName,
        message.messageId,
      )
      messageText = transcription

      logger.info('Audio transcribed', { length: transcription.length })

      // Atualizar mensagem no DB com a transcrição real
      await db.message.updateMany({
        where: { providerMessageId: message.messageId },
        data: { content: transcription },
      })
    }

    // -----------------------------------------------------------------------
    // 2c. Download de mídia + contexto LLM para image/document
    // -----------------------------------------------------------------------
    if (message.media && (message.type === 'image' || message.type === 'document' || message.type === 'audio')) {
      // Best-effort: falha não bloqueia o fluxo
      await downloadAndStoreMedia({
        instanceName: message.instanceName,
        messageId: message.messageId,
        providerMessageId: message.messageId,
        conversationId,
        organizationId,
        mimetype: message.media.mimetype,
        fileName: message.media.fileName,
      }).catch((error) => {
        logger.warn('Media download failed (non-fatal)', {
          messageId: message.messageId,
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }

    // Para image/document: IA não "vê" a mídia mas sabe que foi enviada
    if (message.type === 'image') {
      const caption = message.text ? ` com legenda: "${message.text}"` : ''
      messageText = `[O cliente enviou uma imagem${caption}]`
    } else if (message.type === 'document') {
      const fileName = message.media?.fileName ?? 'arquivo'
      messageText = `[O cliente enviou um documento: "${fileName}"]`
    }

    // -----------------------------------------------------------------------
    // 3. Context loading — prompt dinâmico + histórico + dados da conversa
    // -----------------------------------------------------------------------
    const [promptContext, messageHistory, conversation] = await Promise.all([
      buildSystemPrompt(agentId, conversationId, messageText ?? undefined),
      db.message.findMany({
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
      db.conversation.findUniqueOrThrow({
        where: { id: conversationId },
        select: { contactId: true, dealId: true },
      }),
    ])

    updateActiveTrace({
      metadata: {
        agentId,
        contactName: promptContext.contactName,
        model: promptContext.modelId,
        messageType: message.type,
      },
    })

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
    // 4b. Build tool set (filtrado pelo toolsEnabled do agent)
    // -----------------------------------------------------------------------
    const toolContext: ToolContext = {
      organizationId,
      agentId,
      conversationId,
      contactId: conversation.contactId,
      dealId: conversation.dealId,
      pipelineIds: promptContext.pipelineIds,
    }

    const tools = buildToolSet(promptContext.toolsEnabled, toolContext)

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
      tools,
      stopWhen: stepCountIs(3),
      maxOutputTokens: 1024,
      experimental_telemetry: {
        isEnabled: true,
        tracer: langfuseTracer,
        functionId: 'chat-completion',
        metadata: {
          agentId,
          conversationId,
          model: promptContext.modelId,
          contactName: promptContext.contactName,
        },
      },
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
    const freshConversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { aiPaused: true },
    })

    if (freshConversation?.aiPaused) {
      // Salva resposta no banco mas NÃO envia no WhatsApp
      await db.message.create({
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
    await db.message.create({
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
      toolCalls: result.steps?.flatMap(
        (step) => step.toolCalls?.map((toolCall) => toolCall.toolName) ?? [],
      ) ?? [],
      totalSteps: result.steps?.length ?? 1,
    })

    return { success: true }
    } finally {
      await flushLangfuse()
    }
    }, { name: 'process-agent-message' })() // observe
  },
})

// ---------------------------------------------------------------------------
// Memory Compression
// ---------------------------------------------------------------------------

async function compressMemory(conversationId: string): Promise<void> {
  try {
    const totalMessages = await db.message.count({
      where: { conversationId, isArchived: false },
    })

    if (totalMessages < SUMMARIZATION_THRESHOLD) return

    // Buscar todas as mensagens ativas ordenadas por data
    const allMessages = await db.message.findMany({
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
      experimental_telemetry: {
        isEnabled: true,
        tracer: langfuseTracer,
        functionId: 'memory-compression',
        metadata: { conversationId, model: SUMMARIZATION_MODEL },
      },
    })

    const summary = summaryResult.text

    if (!summary) {
      logger.warn('Summarization returned empty result', { conversationId })
      return
    }

    // Transaction: salvar summary + arquivar mensagens antigas
    const archiveIds = messagesToArchive.map((msg) => msg.id)

    await db.$transaction([
      db.conversation.update({
        where: { id: conversationId },
        data: { summary },
      }),
      db.message.updateMany({
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

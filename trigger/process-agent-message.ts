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

    // Helper de log — sempre inclui msgId + conversationId para rastreio
    const ctx = { msgId: message.messageId, conversationId, agentId }
    const log = (step: string, outcome: 'PASS' | 'EXIT' | 'SKIP', extra?: Record<string, unknown>) =>
      logger.info(`[agent] ${step} → ${outcome}`, { ...ctx, ...extra })

    log('step:0 task_started', 'PASS', { type: message.type, remoteJid: message.remoteJid, organizationId })

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
        log('step:1 debounce_check', 'EXIT', {
          reason: 'newer_message_exists',
          myTimestamp: debounceTimestamp,
          currentTimestamp,
        })
        return { skipped: true, reason: 'debounce' }
      }
      log('step:1 debounce_check', 'PASS')
    } catch (error) {
      log('step:1 debounce_check', 'PASS', { warning: 'redis_failed_continuing' })
      logger.warn('Redis debounce check failed, continuing', { ...ctx, error })
    }

    // -----------------------------------------------------------------------
    // 2. Credit check
    // -----------------------------------------------------------------------
    const balance = await checkBalance(organizationId)

    if (balance.available <= 0) {
      log('step:2 credit_check', 'EXIT', { reason: 'no_credits', balance: balance.available })

      const noCreditsIds = await sendWhatsAppMessage(
        message.instanceName,
        message.remoteJid,
        NO_CREDITS_MESSAGE,
      )

      await Promise.all(
        noCreditsIds.map((sentId) =>
          redis.set(`dedup:${sentId}`, '1', 'EX', 300).catch(() => {}),
        ),
      )

      return { skipped: true, reason: 'no_credits' }
    }
    log('step:2 credit_check', 'PASS', { credits: balance.available })

    // -----------------------------------------------------------------------
    // 2b. Se áudio, transcrever com Whisper
    // -----------------------------------------------------------------------
    let messageText = message.text
    if (message.type === 'audio' && message.media) {
      log('step:3a audio_transcription', 'PASS', { seconds: message.media.seconds })

      const transcription = await transcribeAudio(
        message.instanceName,
        message.messageId,
      )
      messageText = transcription

      log('step:3a audio_transcribed', 'PASS', { length: transcription.length })

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
      log('step:3b media_download', 'PASS', { type: message.type, mimetype: message.media.mimetype })

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
          ...ctx,
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
    log('step:4 context_loading', 'PASS')

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

    log('step:4 context_loaded', 'PASS', {
      model: promptContext.modelId,
      historyCount: messageHistory.length,
      hasSummary: !!promptContext.summary,
      estimatedTokens: promptContext.estimatedTokens,
      contactName: promptContext.contactName,
    })

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
    log('step:5 llm_call', 'PASS', {
      model: promptContext.modelId,
      messageCount: llmMessages.length,
      toolCount: Object.keys(tools ?? {}).length,
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
      log('step:5 llm_call', 'EXIT', { reason: 'empty_response', llmDurationMs })
      return { skipped: true, reason: 'empty_response' }
    }

    log('step:5 llm_response', 'PASS', {
      llmDurationMs,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      steps: result.steps?.length ?? 1,
      toolCalls: result.steps?.flatMap(
        (step) => step.toolCalls?.map((toolCall) => toolCall.toolName) ?? [],
      ) ?? [],
    })

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

      log('step:6 pause_recheck', 'EXIT', { reason: 'ai_paused_during_generation', llmDurationMs })
      return { skipped: true, reason: 'ai_paused_during_generation' }
    }
    log('step:6 pause_recheck', 'PASS')

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
    log('step:7 response_saved', 'PASS')

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

    log('step:8 debit_credits', debited ? 'PASS' : 'SKIP', { debited })

    // -----------------------------------------------------------------------
    // 10. Send WhatsApp message + pre-register dedup keys
    // -----------------------------------------------------------------------
    const sentMessageIds = await sendWhatsAppMessage(
      message.instanceName,
      message.remoteJid,
      responseText,
    )

    // Pré-registrar dedup keys para que o webhook fromMe ignore estas mensagens
    // (evita duplicata no banco + auto-pause da IA)
    await Promise.all(
      sentMessageIds.map((sentId) =>
        redis.set(`dedup:${sentId}`, '1', 'EX', 300).catch(() => {}),
      ),
    )

    log('step:9 whatsapp_sent', 'PASS', { responseLength: responseText.length, sentMessageIds })

    // -----------------------------------------------------------------------
    // 11. Memory compression — se >= threshold msgs, summarizar e arquivar
    // -----------------------------------------------------------------------
    await compressMemory(conversationId)

    // -----------------------------------------------------------------------
    // 12. Logging final
    // -----------------------------------------------------------------------
    const totalDurationMs = Date.now() - taskStartMs

    log('step:10 completed', 'PASS', {
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      llmDurationMs,
      totalDurationMs,
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

import { logger } from '@trigger.dev/sdk/v3'
import { generateText } from 'ai'
import { getModel } from '@/_lib/ai/provider'
import { SUMMARIZATION_MODEL_ID } from '@/_lib/ai/models'
import { db } from '@/_lib/prisma'
import { langfuseTracer } from './langfuse'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompressMemoryOptions {
  conversationId: string
  threshold?: number // default 12
  keepRecent?: number // default 3
}

interface CompressMemoryResult {
  compressed: boolean
  archivedCount: number
  summaryLength: number
  reason?: 'below_threshold' | 'nothing_to_archive' | 'summary_empty' | 'error'
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_THRESHOLD = 12
const DEFAULT_KEEP_RECENT = 3

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Comprime o histórico de mensagens de uma conversa quando ultrapassa o threshold.
 * Arquiva mensagens antigas e salva um resumo na conversa para contexto futuro.
 * Non-fatal: qualquer falha retorna resultado com reason='error' sem lançar exceção.
 */
export async function compressMemory(
  options: CompressMemoryOptions,
): Promise<CompressMemoryResult> {
  const {
    conversationId,
    threshold = DEFAULT_THRESHOLD,
    keepRecent = DEFAULT_KEEP_RECENT,
  } = options

  try {
    const totalMessages = await db.message.count({
      where: { conversationId, isArchived: false },
    })

    if (totalMessages < threshold) {
      return { compressed: false, archivedCount: 0, summaryLength: 0, reason: 'below_threshold' }
    }

    const allMessages = await db.message.findMany({
      where: { conversationId, isArchived: false },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
      },
    })

    const toArchiveCount = allMessages.length - keepRecent
    if (toArchiveCount <= 0) {
      return { compressed: false, archivedCount: 0, summaryLength: 0, reason: 'nothing_to_archive' }
    }

    const messagesToArchive = allMessages.slice(0, toArchiveCount)

    const transcript = messagesToArchive
      .map((msg) => `[${msg.role}]: ${msg.content}`)
      .join('\n')

    const summaryResult = await generateText({
      model: getModel(SUMMARIZATION_MODEL_ID),
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
        metadata: { conversationId, model: SUMMARIZATION_MODEL_ID },
      },
    })

    const summary = summaryResult.text

    if (!summary) {
      logger.warn('Memory compression failed — empty summary', { conversationId })
      return { compressed: false, archivedCount: 0, summaryLength: 0, reason: 'summary_empty' }
    }

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

    return {
      compressed: true,
      archivedCount: archiveIds.length,
      summaryLength: summary.length,
    }
  } catch (error) {
    // Non-fatal: falha na compressão não bloqueia o fluxo principal
    logger.warn('Memory compression failed', { conversationId, error })
    return { compressed: false, archivedCount: 0, summaryLength: 0, reason: 'error' }
  }
}

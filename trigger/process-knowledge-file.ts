import { task, logger } from '@trigger.dev/sdk/v3'
import { embedMany } from 'ai'
import { randomUUID } from 'crypto'
import { getEmbeddingModel } from '@/_lib/ai'
import { db } from '@/_lib/prisma'
import { chunkText } from './utils/chunk-text'

const EMBEDDING_BATCH_SIZE = 50

export interface ProcessKnowledgeFilePayload {
  fileId: string
  agentId: string
  extractedText: string
}

export const processKnowledgeFile = task({
  id: 'process-knowledge-file',
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: ProcessKnowledgeFilePayload) => {
    const { fileId, agentId, extractedText } = payload

    try {
      logger.info('Processing knowledge file', {
        fileId,
        agentId,
        textLength: extractedText.length,
      })

      // 1. Chunk text
      const chunks = chunkText(extractedText)

      if (chunks.length === 0) {
        await db.agentKnowledgeFile.update({
          where: { id: fileId },
          data: { status: 'FAILED', errorReason: 'Nenhum conteúdo extraído do arquivo.' },
        })
        return { success: false, reason: 'empty_content' }
      }

      logger.info('Text chunked', { fileId, chunkCount: chunks.length })

      // 2. Generate embeddings in batches
      const allEmbeddings: number[][] = []

      for (let batchStart = 0; batchStart < chunks.length; batchStart += EMBEDDING_BATCH_SIZE) {
        const batch = chunks.slice(batchStart, batchStart + EMBEDDING_BATCH_SIZE)

        const { embeddings } = await embedMany({
          model: getEmbeddingModel(),
          values: batch,
        })

        allEmbeddings.push(...embeddings)

        logger.info('Embedding batch completed', {
          fileId,
          batchStart,
          batchSize: batch.length,
          totalProcessed: allEmbeddings.length,
          totalChunks: chunks.length,
        })
      }

      // 3. Insert chunks via raw SQL (Prisma doesn't support vector type)
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const id = randomUUID()
        const content = chunks[chunkIndex]
        const embedding = allEmbeddings[chunkIndex]
        const embeddingStr = `[${embedding.join(',')}]`

        await db.$executeRaw`
          INSERT INTO agent_knowledge_chunks (id, file_id, agent_id, content, embedding, metadata, created_at)
          VALUES (${id}, ${fileId}, ${agentId}, ${content}, ${embeddingStr}::vector, ${JSON.stringify({ chunkIndex })}::jsonb, NOW())
        `
      }

      // 4. Update file status
      await db.agentKnowledgeFile.update({
        where: { id: fileId },
        data: {
          status: 'COMPLETED',
          chunkCount: chunks.length,
        },
      })

      logger.info('Knowledge file processed successfully', {
        fileId,
        agentId,
        chunkCount: chunks.length,
      })

      return { success: true, chunkCount: chunks.length }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

      logger.error('Knowledge file processing failed', {
        fileId,
        agentId,
        error: errorMessage,
      })

      await db.agentKnowledgeFile.update({
        where: { id: fileId },
        data: {
          status: 'FAILED',
          errorReason: errorMessage.slice(0, 500),
        },
      })

      throw error
    }
  },
})

import { embed } from 'ai'
import { getEmbeddingModel } from '@/_lib/ai'
import { db } from '@/_lib/prisma'

export interface KnowledgeSearchResult {
  content: string
  fileName: string
  similarity: number
}

/**
 * Busca semântica na base de conhecimento de um agente via pgvector.
 * Retorna chunks mais similares à query ordenados por relevância.
 */
export async function searchKnowledge(
  agentId: string,
  query: string,
  topK = 3,
  minSimilarity = 0.72,
): Promise<KnowledgeSearchResult[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: query,
  })

  const embeddingStr = `[${embedding.join(',')}]`

  const rawResults = await db.$queryRaw<Array<{ content: string; fileName: string; similarity: string | number }>>`
    SELECT
      c.content,
      f.file_name AS "fileName",
      1 - (c.embedding <=> ${embeddingStr}::vector) AS similarity
    FROM agent_knowledge_chunks c
    JOIN agent_knowledge_files f ON f.id = c.file_id
    WHERE c.agent_id = ${agentId}
      AND f.status = 'COMPLETED'
      AND 1 - (c.embedding <=> ${embeddingStr}::vector) >= ${minSimilarity}
    ORDER BY c.embedding <=> ${embeddingStr}::vector
    LIMIT ${topK}
  `

  // Prisma $queryRaw retorna numéricos do Postgres como string/Decimal
  return rawResults.map((row) => ({
    content: row.content,
    fileName: row.fileName,
    similarity: Number(row.similarity),
  }))
}

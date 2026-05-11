import { embed } from 'ai'
import { getEmbeddingModel } from '@/_lib/ai/provider'
import { db } from '@/_lib/prisma'

export interface ServiceSearchResult {
  id: string
  name: string
  duration: number
  price: number
  categoryId: string
  similarity: number
}

/**
 * Busca semântica de serviços de uma organização via pgvector.
 * Apenas serviços ativos com embedding gerado. Sem fallback ilike — o backfill
 * garante que todos os serviços ativos possuem embedding antes do uso.
 *
 * Nota: roda no Trigger.dev worker — não usa unstable_cache.
 */
export async function searchServices(
  organizationId: string,
  query: string,
  topK = 5,
  minSimilarity = 0.65,
): Promise<ServiceSearchResult[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: query,
  })

  const embeddingStr = `[${embedding.join(',')}]`

  const rawResults = await db.$queryRaw<
    Array<{
      id: string
      name: string
      duration: number
      price: string | number
      category_id: string
      similarity: string | number
    }>
  >`
    SELECT
      s.id,
      s.name,
      s.duration,
      s.price,
      s.category_id,
      1 - (s.embedding <=> ${embeddingStr}::vector) AS similarity
    FROM services s
    WHERE s.organization_id = ${organizationId}
      AND s.is_active = true
      AND s.embedding IS NOT NULL
      AND 1 - (s.embedding <=> ${embeddingStr}::vector) >= ${minSimilarity}
    ORDER BY s.embedding <=> ${embeddingStr}::vector
    LIMIT ${topK}
  `

  return rawResults.map((row) => ({
    id: row.id,
    name: row.name,
    duration: Number(row.duration),
    price: Number(row.price),
    categoryId: row.category_id,
    similarity: Number(row.similarity),
  }))
}

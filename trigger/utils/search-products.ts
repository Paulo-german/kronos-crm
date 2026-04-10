import { embed } from 'ai'
import { getEmbeddingModel } from '@/_lib/ai/provider'
import { db } from '@/_lib/prisma'

export interface ProductSearchResult {
  id: string
  name: string
  description: string | null
  price: number
  similarity: number
  mediaCount: number
}

/**
 * Busca semântica no catálogo de produtos de uma organização via pgvector.
 * Retorna produtos mais similares à query ordenados por relevância.
 * Filtra apenas produtos ativos com embedding gerado.
 *
 * Nota: roda no Trigger.dev worker — não usa unstable_cache.
 */
export async function searchProducts(
  organizationId: string,
  query: string,
  topK = 5,
  minSimilarity = 0.65,
): Promise<ProductSearchResult[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: query,
  })

  const embeddingStr = `[${embedding.join(',')}]`

  const rawResults = await db.$queryRaw<
    Array<{
      id: string
      name: string
      description: string | null
      price: string | number
      similarity: string | number
      mediaCount: string | number
    }>
  >`
    SELECT
      p.id,
      p.name,
      p.description,
      p.price,
      1 - (p.embedding <=> ${embeddingStr}::vector) AS similarity,
      (SELECT COUNT(*) FROM product_media pm WHERE pm.product_id = p.id)::int AS "mediaCount"
    FROM products p
    WHERE p.organization_id = ${organizationId}
      AND p.is_active = true
      AND p.embedding IS NOT NULL
      AND 1 - (p.embedding <=> ${embeddingStr}::vector) >= ${minSimilarity}
    ORDER BY p.embedding <=> ${embeddingStr}::vector
    LIMIT ${topK}
  `

  // Prisma $queryRaw retorna numéricos do Postgres como string/Decimal
  return rawResults.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    similarity: Number(row.similarity),
    mediaCount: Number(row.mediaCount),
  }))
}

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
  /** URL pública da primeira mídia do produto (order asc), ou null se não houver */
  mediaUrl: string | null
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
      mediaUrl: string | null
    }>
  >`
    SELECT
      p.id,
      p.name,
      p.description,
      p.price,
      1 - (p.embedding <=> ${embeddingStr}::vector) AS similarity,
      (SELECT COUNT(*) FROM product_media pm WHERE pm.product_id = p.id)::int AS "mediaCount",
      (SELECT pm2.url FROM product_media pm2 WHERE pm2.product_id = p.id ORDER BY pm2.order ASC, pm2.created_at ASC LIMIT 1) AS "mediaUrl"
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
    mediaUrl: row.mediaUrl ?? null,
  }))
}

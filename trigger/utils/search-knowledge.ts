import { embed } from 'ai'
import { getEmbeddingModel } from '@/_lib/ai/provider'
import { db } from '@/_lib/prisma'

export interface KnowledgeSearchResult {
  content: string
  fileName: string
  similarity: number
}

// Piso de RECALL: busca ampla. `text-embedding-3-small` em PT gera ~0.4–0.65 para
// matches relevantes; 0.35 captura os relevantes sem deixar passar lixo óbvio (<0.35).
// A precisão fica a cargo de selectTopChunks (corte relativo + teto).
export const KNOWLEDGE_FLOOR_SIMILARITY = 0.35
// Over-fetch: busca mais candidatos do que vamos usar, para o filtro escolher.
export const KNOWLEDGE_OVERFETCH_K = 8
// Precisão: no máximo N chunks selecionados...
export const KNOWLEDGE_MAX_RESULTS = 3
// ...e só os que estão até `gap` de similaridade abaixo do melhor resultado.
export const KNOWLEDGE_RELATIVE_GAP = 0.1

/**
 * Busca semântica na base de conhecimento de um agente via pgvector.
 * Retorna chunks mais similares à query ordenados por relevância (desc).
 */
export async function searchKnowledge(
  agentId: string,
  query: string,
  topK = KNOWLEDGE_OVERFETCH_K,
  minSimilarity = KNOWLEDGE_FLOOR_SIMILARITY,
): Promise<KnowledgeSearchResult[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: query,
  })

  const embeddingStr = `[${embedding.join(',')}]`

  const rawResults = await db.$queryRaw<
    Array<{ content: string; fileName: string; similarity: string | number }>
  >`
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

/**
 * Seleção de PRECISÃO sobre o recall do searchKnowledge.
 *
 * `results` vem ordenado por similaridade desc. Mantém o melhor chunk e os que
 * estão dentro de `relativeGap` dele, limitado a `maxResults`. Corte relativo
 * (não absoluto): quando há um chunk dominante, devolve poucos; quando há vários
 * parecidos, devolve até o teto. Evita injetar contexto marginal e perder o relevante.
 */
export function selectTopChunks(
  results: KnowledgeSearchResult[],
  maxResults = KNOWLEDGE_MAX_RESULTS,
  relativeGap = KNOWLEDGE_RELATIVE_GAP,
): KnowledgeSearchResult[] {
  if (results.length === 0) return []
  const topScore = results[0].similarity
  return results
    .filter((result) => result.similarity >= topScore - relativeGap)
    .slice(0, maxResults)
}

/**
 * Recall (over-fetch com piso baixo) + precisão (selectTopChunks) num passo só.
 * É o ponto de entrada recomendado para consumidores (tool, pré-fetch). A
 * searchKnowledge crua fica para casos que precisam de topK/threshold próprios.
 */
export async function searchKnowledgeRelevant(
  agentId: string,
  query: string,
): Promise<KnowledgeSearchResult[]> {
  const candidates = await searchKnowledge(agentId, query)
  return selectTopChunks(candidates)
}

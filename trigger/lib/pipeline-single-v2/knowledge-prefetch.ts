import { logger } from '@trigger.dev/sdk/v3'
import { searchKnowledgeRelevant } from '../../utils/search-knowledge'

// Quantos turnos recentes do cliente compõem a query do pré-fetch. Usar uma
// janela (não só a última mensagem) cobre follow-ups curtos ("e quanto custa?"),
// onde a última mensagem isolada seria uma query fraca.
const KB_QUERY_USER_TURNS = 3

interface HistoryItem {
  role: string
  content: string
}

/** Monta a query do pré-fetch a partir das últimas mensagens do cliente. */
function buildKnowledgeQuery(history: HistoryItem[]): string {
  return history
    .filter((message) => message.role === 'user')
    .slice(-KB_QUERY_USER_TURNS)
    .map((message) => message.content)
    .join('\n')
    .trim()
}

/**
 * Retrieval determinístico da base de conhecimento.
 *
 * Em vez de deixar o modelo decidir chamar `search_knowledge` (que ele às vezes
 * pula, às vezes repete em loop), o código busca a KB relevante e injeta no
 * contexto. O modelo recebe os dados prontos e só redige — quem controla o
 * retrieval é o código.
 *
 * Retorna um bloco de contexto pronto para injetar como system message, ou null
 * quando não há query, não há resultados acima do threshold, ou a busca falha
 * (fail-open: a ausência de KB não bloqueia a resposta).
 */
export async function prefetchKnowledgeBlock(args: {
  agentId: string
  history: HistoryItem[]
  conversationId: string
}): Promise<string | null> {
  const query = buildKnowledgeQuery(args.history)
  if (!query) return null

  try {
    const results = await searchKnowledgeRelevant(args.agentId, query)

    if (results.length === 0) return null

    const trechos = results
      .map((result) => `- (${result.fileName}) ${result.content}`)
      .join('\n')

    return (
      '[Base de conhecimento — trechos relevantes para a conversa atual]\n' +
      `${trechos}\n\n` +
      'Responda sobre a empresa, produtos, preços e políticas usando APENAS estes ' +
      'trechos e o contexto da conversa. Se a informação não estiver aqui, diga que ' +
      'vai verificar com a equipe — nunca invente.'
    )
  } catch (error) {
    logger.warn('KB prefetch failed', {
      conversationId: args.conversationId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

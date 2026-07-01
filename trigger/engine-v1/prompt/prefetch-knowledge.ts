import type { ModelMessage } from 'ai'
import { searchKnowledgeRelevant } from '../../utils/search-knowledge'

// Quantas mensagens do CLIENTE formam a consulta do prefetch. Janela pequena — a
// mensagem atual + as anteriores capturam o tópico corrente. Limitação conhecida:
// tópico antigo que sai da janela some do bloco (a tool cobre a re-busca; a solução
// de raiz é ancorar a consulta no ledger — Fase 1a).
const QUERY_USER_TURNS = 3

// Retrieval determinístico da base de conhecimento: em vez de depender do modelo
// chamar search_knowledge (pula às vezes, repete em loop outras), o código busca os
// trechos relevantes e injeta no prompt do redator. É um REFORÇO — a tool continua
// como rede de segurança pra re-buscar contexto que saiu da janela. Fail-open: sem
// consulta ou sem resultado → null (nenhum bloco injetado).
export async function prefetchKnowledge(
  agentId: string,
  messages: ModelMessage[],
): Promise<string | null> {
  const query = buildQuery(messages)
  if (!query) return null

  const chunks = await searchKnowledgeRelevant(agentId, query)
  if (chunks.length === 0) return null

  return [
    '[Base de conhecimento — trechos relevantes para a conversa atual]',
    ...chunks.map((chunk) => `- ${chunk.content}`),
    '',
    'Responda sobre a empresa, produtos, preços e políticas usando APENAS estes trechos e o contexto da conversa. Se a informação não estiver aqui, diga que vai verificar com a equipe — nunca invente.',
  ].join('\n')
}

function buildQuery(messages: ModelMessage[]): string {
  return messages
    .filter((message) => message.role === 'user')
    .slice(-QUERY_USER_TURNS)
    .map((message) =>
      typeof message.content === 'string' ? message.content : '',
    )
    .join('\n')
    .trim()
}

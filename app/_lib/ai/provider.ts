import 'server-only'
import { createOpenAI } from '@ai-sdk/openai'

// NOTA: o embedding model (`openai/text-embedding-3-small`) é HARDCODED aqui
// intencionalmente e NÃO faz parte de AI_MODELS (lista canônica de chat models).
// Razões:
//   1. Não é user-selectable (nenhum picker oferece escolha de embedding).
//   2. Não tem pricing configurável — credit cost do embedding é contabilizado
//      separadamente no lugar de uso (ver trigger/process-knowledge-file.ts).
//   3. Papel diferente: semantic search, não generation. Misturar na lista
//      canônica confundiria o consumidor (pickers, Zod validators).
// Se no futuro precisar trocar ou expor, extrair uma constante EMBEDDING_MODEL_ID
// neste arquivo — mas mantê-la fora de models.ts.

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

/**
 * Retorna model pronto para uso com Vercel AI SDK.
 * O modelId vem do campo Agent.modelId (ex: "anthropic/claude-sonnet-4").
 */
export function getModel(modelId: string) {
  return openrouter.chat(modelId)
}

/**
 * Retorna embedding model para gerar/buscar vetores na knowledge base.
 * Usa text-embedding-3-small (1536 dims) via OpenRouter.
 */
export function getEmbeddingModel() {
  return openrouter.embedding('openai/text-embedding-3-small')
}

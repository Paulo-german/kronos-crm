import { createOpenAI } from '@ai-sdk/openai'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

/**
 * Retorna model pronto para uso com Vercel AI SDK.
 * O modelId vem do campo Agent.modelId (ex: "anthropic/claude-sonnet-4").
 */
export function getModel(modelId: string) {
  return openrouter(modelId)
}

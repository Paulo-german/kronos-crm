import { tool } from 'ai'
import { z } from 'zod'
import { logger } from '@trigger.dev/sdk/v3'
import { searchKnowledge } from '../utils/search-knowledge'
import type { ToolContext } from './types'

interface SearchKnowledgeResult {
  success: boolean
  message: string
  results?: Array<{ content: string; fileName: string; similarity: number }>
}

export function createSearchKnowledgeTool(ctx: ToolContext) {
  return tool({
    description:
      'Busca informações na base de conhecimento do agente. Use quando o cliente perguntar sobre algo que pode estar nos documentos enviados (ex: políticas, preços, procedimentos, informações técnicas).',
    inputSchema: z.object({
      query: z
        .string()
        .describe('Pergunta ou termo de busca para encontrar informações relevantes na base de conhecimento'),
    }),
    execute: async ({ query }): Promise<SearchKnowledgeResult> => {
      const results = await searchKnowledge(ctx.agentId, query, 5, 0.65)

      if (results.length === 0) {
        logger.info('Tool search_knowledge: no results', {
          agentId: ctx.agentId,
          query,
          conversationId: ctx.conversationId,
        })

        return {
          success: true,
          message: 'Nenhum resultado encontrado na base de conhecimento para esta consulta.',
        }
      }

      logger.info('Tool search_knowledge executed', {
        agentId: ctx.agentId,
        query,
        resultCount: results.length,
        conversationId: ctx.conversationId,
      })

      return {
        success: true,
        message: `Encontrados ${results.length} trechos relevantes na base de conhecimento.`,
        results: results.map((result) => ({
          content: result.content,
          fileName: result.fileName,
          similarity: Number(result.similarity.toFixed(2)),
        })),
      }
    },
  })
}

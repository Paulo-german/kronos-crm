import { tool } from 'ai'
import { z } from 'zod'
import { logger } from '@trigger.dev/sdk/v3'
import { searchServices } from '../utils/search-services'
import type { ToolContext } from './types'

interface SearchServiceResult {
  success: boolean
  message: string
  services?: Array<{
    id: string
    name: string
    duration: number
    price: number
    similarity: number
  }>
}

export function createSearchServiceTool(ctx: ToolContext) {
  return tool({
    description:
      'Busca um serviço pelo nome ou descrição. Use quando o cliente mencionar um serviço específico e você precisar do ID para agendar.',
    inputSchema: z.object({
      query: z
        .string()
        .describe('Nome ou descrição do serviço (ex: "corte de cabelo", "massagem relaxante")'),
    }),
    execute: async ({ query }): Promise<SearchServiceResult> => {
      try {
        const results = await searchServices(ctx.organizationId, query)

        if (results.length === 0) {
          logger.info('Tool search_service: no results', {
            organizationId: ctx.organizationId,
            query,
            conversationId: ctx.conversationId,
          })
          return {
            success: true,
            message: 'Nenhum serviço encontrado para esta busca. Tente get_services para ver todos.',
          }
        }

        logger.info('Tool search_service executed', {
          organizationId: ctx.organizationId,
          query,
          resultCount: results.length,
          conversationId: ctx.conversationId,
        })

        return {
          success: true,
          message: `${results.length} serviço(s) encontrado(s).`,
          services: results.map((result) => ({
            id: result.id,
            name: result.name,
            duration: result.duration,
            price: result.price,
            similarity: Number(result.similarity.toFixed(2)),
          })),
        }
      } catch (error) {
        logger.error('Tool search_service failed', { error })
        return { success: false, message: 'Erro ao buscar serviço. Tente novamente.' }
      }
    },
  })
}

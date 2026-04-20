import { tool } from 'ai'
import { z } from 'zod'
import { logger } from '@trigger.dev/sdk/v3'
import { searchProducts } from '../utils/search-products'
import type { ToolContext } from './types'

interface SearchProductsResult {
  success: boolean
  message: string
  products?: Array<{
    id: string
    name: string
    description: string | null
    price: number
    /** URL pública da primeira mídia do produto — use em linha isolada para enviar ao cliente */
    mediaUrl: string | null
    hasMedia: boolean
    similarity: number
  }>
}

export function createSearchProductsTool(ctx: ToolContext) {
  return tool({
    description:
      'Busca produtos no catalogo da empresa por nome, tipo ou caracteristicas. Use quando o cliente perguntar sobre produtos, precos ou opcoes disponiveis.',
    inputSchema: z.object({
      query: z.string().describe(
        'Termo de busca para encontrar produtos (ex: nome do produto, tipo, caracteristica)',
      ),
    }),
    execute: async ({ query }): Promise<SearchProductsResult> => {
      try {
        const results = await searchProducts(ctx.organizationId, query, 5, 0.65)

        if (results.length === 0) {
          logger.info('Tool search_products: no results', {
            organizationId: ctx.organizationId,
            query,
            conversationId: ctx.conversationId,
          })

          return {
            success: true,
            message: 'Nenhum produto encontrado para esta busca.',
          }
        }

        logger.info('Tool search_products executed', {
          organizationId: ctx.organizationId,
          query,
          resultCount: results.length,
          conversationId: ctx.conversationId,
        })

        return {
          success: true,
          message: `Encontrados ${results.length} produto(s).`,
          products: results.map((result) => ({
            id: result.id,
            name: result.name,
            description: result.description,
            price: Number(result.price),
            mediaUrl: result.mediaUrl,
            hasMedia: result.mediaCount > 0,
            similarity: Number(Number(result.similarity).toFixed(2)),
          })),
        }
      } catch (error) {
        logger.error('Tool search_products failed', { error })
        return {
          success: false,
          message: 'Erro ao buscar produtos. Tente novamente.',
        }
      }
    },
  })
}

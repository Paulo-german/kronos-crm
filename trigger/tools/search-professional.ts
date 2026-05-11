import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import type { ToolContext } from './types'

interface SearchProfessionalResult {
  success: boolean
  message: string
  professionals?: Array<{ id: string; name: string }>
}

const MAX_PROFESSIONAL_RESULTS = 5

export function createSearchProfessionalTool(ctx: ToolContext) {
  return tool({
    description:
      'Busca um profissional pelo nome. Use APENAS quando o cliente pedir explicitamente um profissional específico (ex: "quero com a Ana", "prefiro o Carlos").',
    inputSchema: z.object({
      name: z
        .string()
        .describe('Nome ou parte do nome do profissional (ex: "Ana", "Carlos")'),
    }),
    execute: async ({ name }): Promise<SearchProfessionalResult> => {
      try {
        const professionals = await db.professional.findMany({
          where: {
            organizationId: ctx.organizationId,
            isActive: true,
            name: { contains: name, mode: 'insensitive' },
          },
          select: { id: true, name: true },
          take: MAX_PROFESSIONAL_RESULTS,
        })

        if (professionals.length === 0) {
          return {
            success: true,
            message: `Nenhum profissional encontrado com o nome "${name}".`,
          }
        }

        logger.info('Tool search_professional executed', {
          organizationId: ctx.organizationId,
          name,
          resultCount: professionals.length,
          conversationId: ctx.conversationId,
        })

        return {
          success: true,
          message: `${professionals.length} profissional(is) encontrado(s).`,
          professionals,
        }
      } catch (error) {
        logger.error('Tool search_professional failed', { error })
        return { success: false, message: 'Erro ao buscar profissional. Tente novamente.' }
      }
    },
  })
}

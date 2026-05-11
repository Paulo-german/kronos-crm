import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import type { ToolContext } from './types'

interface GetServicesResult {
  success: boolean
  message: string
  services?: Array<{
    id: string
    name: string
    duration: number
    price: number
    category: string
  }>
}

export function createGetServicesTool(ctx: ToolContext) {
  return tool({
    description:
      'Lista os serviços disponíveis da empresa com duração e preço. Use quando o cliente perguntar quais serviços existem ou quais opções há.',
    inputSchema: z.object({}),
    execute: async (): Promise<GetServicesResult> => {
      try {
        const services = await db.service.findMany({
          where: { organizationId: ctx.organizationId, isActive: true },
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            category: { select: { name: true } },
          },
          orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
        })

        if (services.length === 0) {
          return { success: true, message: 'Nenhum serviço disponível.' }
        }

        logger.info('Tool get_services executed', {
          organizationId: ctx.organizationId,
          count: services.length,
          conversationId: ctx.conversationId,
        })

        return {
          success: true,
          message: `${services.length} serviço(s) disponível(is).`,
          services: services.map((service) => ({
            id: service.id,
            name: service.name,
            duration: service.duration,
            price: Number(service.price),
            category: service.category.name,
          })),
        }
      } catch (error) {
        logger.error('Tool get_services failed', { error })
        return { success: false, message: 'Erro ao listar serviços. Tente novamente.' }
      }
    },
  })
}

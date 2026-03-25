import { tool } from 'ai'
import { z } from 'zod'
import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import type { ToolContext } from './types'

interface SendProductMediaResult {
  success: boolean
  message: string
  sentCount?: number
}

export function createSendProductMediaTool(ctx: ToolContext) {
  return tool({
    description:
      'Envia fotos e videos de um produto para o cliente via WhatsApp. Use apos encontrar o produto com search_products, quando o cliente quiser ver fotos ou detalhes visuais. Informe o productId obtido na busca.',
    inputSchema: z.object({
      productId: z.string().describe(
        'ID do produto cujas fotos/videos devem ser enviadas ao cliente. Obtenha o ID via search_products.',
      ),
    }),
    execute: async ({ productId }): Promise<SendProductMediaResult> => {
      try {
        // 1. Validar que remoteJid e inboxProvider existem no contexto
        if (!ctx.remoteJid || !ctx.inboxProvider) {
          logger.warn('Tool send_product_media: missing remoteJid or inboxProvider', {
            conversationId: ctx.conversationId,
            hasRemoteJid: !!ctx.remoteJid,
            hasInboxProvider: !!ctx.inboxProvider,
          })
          return {
            success: false,
            message: 'Canal de envio nao disponivel para esta conversa.',
          }
        }

        // 2. Buscar mídias do produto (valida isActive + ownership pela organizationId)
        const mediaList = await db.productMedia.findMany({
          where: {
            productId,
            organizationId: ctx.organizationId,
            product: { isActive: true },
          },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            url: true,
            mimeType: true,
            fileName: true,
            type: true,
            product: { select: { name: true } },
          },
        })

        if (mediaList.length === 0) {
          return {
            success: false,
            message: 'Produto sem midias cadastradas.',
          }
        }

        // 3. Resolver provider WhatsApp
        const provider = resolveWhatsAppProvider(ctx.inboxProvider)
        const remoteJid = ctx.remoteJid

        let sentCount = 0

        // 4. Enviar cada mídia
        for (const media of mediaList) {
          try {
            const mediatype = media.type === 'VIDEO' ? 'video' : 'image'
            const productName = media.product.name
            let sentId: string

            if (ctx.inboxProvider.connectionType === 'META_CLOUD') {
              // Meta Cloud: precisa de base64 — download da URL pública e converte
              const response = await fetch(media.url)
              if (!response.ok) {
                logger.warn('Tool send_product_media: failed to download media for Meta', {
                  mediaId: media.id,
                  url: media.url,
                  status: response.status,
                })
                continue
              }
              const buffer = Buffer.from(await response.arrayBuffer())
              const base64 = buffer.toString('base64')

              sentId = await provider.sendMedia(
                remoteJid,
                base64,
                media.mimeType,
                mediatype,
                media.fileName,
                productName,
              )
            } else {
              // Evolution e Z-API: usam URL pública diretamente
              sentId = await provider.sendMedia(
                remoteJid,
                '',
                media.mimeType,
                mediatype,
                media.fileName,
                productName,
                media.url,
              )
            }

            // 5. Registrar dedup key no Redis para evitar loop de webhook (TTL 5 min)
            await redis.set(`dedup:${sentId}`, '1', 'EX', 300).catch(() => {})

            sentCount++
          } catch (mediaError) {
            logger.warn('Tool send_product_media: failed to send individual media', {
              mediaId: media.id,
              conversationId: ctx.conversationId,
              error: mediaError instanceof Error ? mediaError.message : String(mediaError),
            })
          }
        }

        if (sentCount === 0) {
          return {
            success: false,
            message: 'Nao foi possivel enviar nenhuma midia. Tente novamente.',
          }
        }

        logger.info('Tool send_product_media executed', {
          productId,
          sentCount,
          totalMedia: mediaList.length,
          conversationId: ctx.conversationId,
        })

        return {
          success: true,
          message: `${sentCount} midia(s) enviada(s) com sucesso.`,
          sentCount,
        }
      } catch (error) {
        logger.error('Tool send_product_media failed', { error, conversationId: ctx.conversationId })
        return {
          success: false,
          message: 'Erro ao enviar midias do produto. Tente novamente.',
        }
      }
    },
  })
}

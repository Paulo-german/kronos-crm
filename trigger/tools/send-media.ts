import { tool } from 'ai'
import { z } from 'zod'
import { logger } from '@trigger.dev/sdk/v3'
import { redis } from '@/_lib/redis'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import type { ToolContext } from './types'

interface SendMediaResult {
  success: boolean
  message: string
}

// Mapa de extensão para tipo de mídia suportado pelo WhatsApp
const EXTENSION_TO_MEDIA_TYPE: Record<string, 'image' | 'video' | 'document'> = {
  // Imagens
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  webp: 'image',
  gif: 'image',
  // Vídeos
  mp4: 'video',
  '3gp': 'video',
  mov: 'video',
  // Documentos
  pdf: 'document',
  doc: 'document',
  docx: 'document',
  xls: 'document',
  xlsx: 'document',
  ppt: 'document',
  pptx: 'document',
  csv: 'document',
  txt: 'document',
}

// Mapa de extensão para MIME type (necessário para provider.sendMedia())
const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  '3gp': 'video/3gpp',
  mov: 'video/quicktime',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv',
  txt: 'text/plain',
}

// Fallbacks de MIME type por categoria (usado quando extensão não está no mapa)
const MEDIA_TYPE_FALLBACK_MIME: Record<'image' | 'video' | 'document', string> = {
  image: 'image/jpeg',
  video: 'video/mp4',
  document: 'application/octet-stream',
}

const RETRY_DELAY_MS = 1000

/**
 * Sanitiza a URL para a segunda tentativa de envio.
 * Corrige problemas comuns que o LLM pode gerar:
 * - Espaços no início/fim
 * - Pontuação final (.,:;!?)
 * - Espaços no meio da URL
 * - Falta de protocolo https://
 */
function sanitizeUrl(url: string): string {
  let sanitized = url.trim()
  sanitized = sanitized.replace(/[.,;:!?]+$/, '')
  sanitized = sanitized.replace(/\s+/g, '')
  if (!/^https?:\/\//i.test(sanitized)) {
    sanitized = `https://${sanitized}`
  }
  return sanitized
}

export function createSendMediaTool(ctx: ToolContext) {
  return tool({
    description:
      'Envia uma imagem, video ou documento de uma URL publica diretamente ao cliente via WhatsApp. ' +
      'Use quando encontrar URLs de arquivos na base de conhecimento ou em informacoes do contexto. ' +
      'Para imagens (.jpg, .png, .webp), videos (.mp4) e documentos (.pdf), informe a URL. ' +
      'Para links de redes sociais (Instagram, YouTube, etc.), inclua o link na mensagem de texto — nao use send_media.',
    inputSchema: z.object({
      url: z
        .string()
        .url()
        .describe(
          'URL publica da midia a ser enviada (imagem, video ou documento). Deve ser uma URL acessivel publicamente.',
        ),
      type: z
        .enum(['image', 'video', 'document'])
        .optional()
        .describe(
          'Tipo da midia. Se nao informado, sera inferido pela extensao da URL (.jpg/.png/.webp → image, .mp4 → video, .pdf → document).',
        ),
      caption: z
        .string()
        .optional()
        .describe('Legenda opcional a ser exibida junto com a midia no WhatsApp.'),
    }),
    execute: async ({ url, type, caption }): Promise<SendMediaResult> => {
      // Simulator não tem provider WhatsApp — a resposta de mídia já está no contexto da conversa.
      // Retornar sucesso imediatamente sem tentar download ou envio externo.
      if (ctx.inboxProvider?.connectionType === 'SIMULATOR') {
        logger.info('Tool send_media: simulator mode, skipping external send', {
          conversationId: ctx.conversationId,
          url,
        })
        return { success: true, message: 'Mídia enviada (simulado).' }
      }

      // 1. Validar que remoteJid e inboxProvider existem no contexto
      if (!ctx.remoteJid || !ctx.inboxProvider) {
        logger.warn('Tool send_media: missing remoteJid or inboxProvider', {
          conversationId: ctx.conversationId,
          hasRemoteJid: !!ctx.remoteJid,
          hasInboxProvider: !!ctx.inboxProvider,
        })
        return {
          success: false,
          message: 'Canal de envio nao disponivel para esta conversa.',
        }
      }

      // Função interna de envio (reutilizada no retry)
      const attemptSend = async (targetUrl: string): Promise<SendMediaResult> => {
        // 2. Resolver tipo da mídia
        const pathname = new URL(targetUrl).pathname
        const extension = pathname.split('.').pop()?.toLowerCase() ?? ''

        const resolvedType: 'image' | 'video' | 'document' | undefined =
          type ?? EXTENSION_TO_MEDIA_TYPE[extension]

        if (!resolvedType) {
          return {
            success: false,
            message: `Nao foi possivel determinar o tipo do arquivo (extensao "${extension}" desconhecida). Informe o parametro "type" explicitamente.`,
          }
        }

        // 3. Resolver MIME type
        const mimeType = EXTENSION_TO_MIME_TYPE[extension] ?? MEDIA_TYPE_FALLBACK_MIME[resolvedType]

        // 4. Extrair nome do arquivo da URL
        const fileName = pathname.split('/').pop() || 'media'

        // 5. Resolver provider WhatsApp
        const provider = resolveWhatsAppProvider(ctx.inboxProvider!)
        const remoteJid = ctx.remoteJid!

        let sentId: string

        if (ctx.inboxProvider!.connectionType === 'META_CLOUD') {
          // Meta Cloud: download → base64 → upload via Media API
          const response = await fetch(targetUrl)
          if (!response.ok) {
            return {
              success: false,
              message: 'Nao foi possivel fazer o download da midia para envio. Verifique se a URL e publica.',
            }
          }
          const buffer = Buffer.from(await response.arrayBuffer())
          const base64 = buffer.toString('base64')

          sentId = await provider.sendMedia(
            remoteJid,
            base64,
            mimeType,
            resolvedType,
            fileName,
            caption,
          )
        } else {
          // Evolution e Z-API: URL pública diretamente
          sentId = await provider.sendMedia(
            remoteJid,
            '',
            mimeType,
            resolvedType,
            fileName,
            caption,
            targetUrl,
          )
        }

        // 6. Dedup Redis (TTL 5 min)
        await redis.set(`dedup:${sentId}`, '1', 'EX', 300).catch(() => {})

        return { success: true, message: 'Midia enviada com sucesso.' }
      }

      // Tentativa 1: URL original (como veio do LLM)
      try {
        const result = await attemptSend(url)
        if (result.success) {
          logger.info('Tool send_media executed', {
            url,
            attempt: 1,
            conversationId: ctx.conversationId,
          })
          return result
        }

        // Se falhou por tipo desconhecido, não vale retry com sanitização
        if (result.message.includes('extensao')) {
          logger.warn('Tool send_media: unknown extension, skipping retry', {
            url,
            conversationId: ctx.conversationId,
          })
          return result
        }
      } catch (firstError) {
        logger.warn('Tool send_media: first attempt failed, will retry with sanitized URL', {
          url,
          error: firstError,
          conversationId: ctx.conversationId,
        })
      }

      // Tentativa 2: URL sanitizada (corrige problemas comuns do LLM)
      try {
        const sanitizedUrl = sanitizeUrl(url)
        if (sanitizedUrl === url) {
          // Sanitização não mudou nada — não vale tentar de novo
          return {
            success: false,
            message: 'Erro ao enviar midia. A URL pode estar inacessivel.',
          }
        }

        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))

        const retryResult = await attemptSend(sanitizedUrl)
        if (retryResult.success) {
          logger.info('Tool send_media executed (sanitized URL)', {
            originalUrl: url,
            sanitizedUrl,
            attempt: 2,
            conversationId: ctx.conversationId,
          })
        } else {
          logger.warn('Tool send_media: retry with sanitized URL also failed', {
            originalUrl: url,
            sanitizedUrl,
            conversationId: ctx.conversationId,
          })
        }
        return retryResult
      } catch (retryError) {
        logger.error('Tool send_media: both attempts failed', {
          url,
          error: retryError,
          conversationId: ctx.conversationId,
        })
        return {
          success: false,
          message: 'Erro ao enviar midia. Tente novamente.',
        }
      }
    },
  })
}

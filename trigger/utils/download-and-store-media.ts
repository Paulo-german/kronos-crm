import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { uploadMediaToStorage } from '@/_lib/supabase/storage'
import { downloadMetaMedia } from '@/_lib/meta/download-meta-media'
import type { Prisma } from '@prisma/client'

interface EvolutionBase64Response {
  mediaType: string
  mimetype: string
  base64: string
}

interface DownloadAndStoreMediaParams {
  instanceName: string
  messageId: string
  providerMessageId: string
  conversationId: string
  organizationId: string
  mimetype: string
  fileName?: string
}

interface DownloadAndStoreMetaMediaParams {
  mediaId: string
  accessToken: string
  providerMessageId: string
  conversationId: string
  organizationId: string
  mimetype: string
  fileName?: string
}

/**
 * Baixa mídia da Evolution API (getBase64FromMediaMessage) e persiste no Supabase Storage.
 * Atualiza metadata da Message com a URL pública.
 * Best-effort: falha aqui não bloqueia o fluxo principal.
 */
export async function downloadAndStoreMedia({
  instanceName,
  messageId,
  providerMessageId,
  conversationId,
  organizationId,
  mimetype,
  fileName,
}: DownloadAndStoreMediaParams): Promise<string | null> {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY

  if (!apiUrl || !apiKey) {
    logger.warn('Evolution API env vars not configured, skipping media download')
    return null
  }

  try {
    // 1. Buscar mídia em base64 via Evolution API
    const response = await fetch(
      `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({
          message: {
            key: { id: messageId },
          },
        }),
      },
    )

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      logger.warn('Evolution getBase64FromMediaMessage failed', {
        status: response.status,
        errorBody,
        messageId,
      })
      return null
    }

    const data: EvolutionBase64Response = await response.json()

    if (!data.base64) {
      logger.warn('Evolution returned empty base64', { messageId })
      return null
    }

    // 2. Upload para Supabase Storage
    const { publicUrl } = await uploadMediaToStorage({
      organizationId,
      conversationId,
      messageId,
      base64: data.base64,
      mimetype: data.mimetype ?? mimetype,
      fileName,
    })

    // 3. Atualizar metadata da mensagem com a URL pública
    const existingMessage = await db.message.findFirst({
      where: { providerMessageId },
      select: { id: true, metadata: true },
    })

    if (existingMessage) {
      const currentMetadata = (existingMessage.metadata as Record<string, unknown>) ?? {}
      const currentMedia = (currentMetadata.media as Record<string, unknown>) ?? {}

      await db.message.update({
        where: { id: existingMessage.id },
        data: {
          metadata: {
            ...currentMetadata,
            media: {
              ...currentMedia,
              url: publicUrl,
              storedInSupabase: true,
            },
          } as unknown as Prisma.InputJsonValue,
        },
      })
    }

    logger.info('Media downloaded and stored', {
      messageId,
      publicUrl,
      mimetype: data.mimetype ?? mimetype,
    })

    return publicUrl
  } catch (error) {
    logger.warn('downloadAndStoreMedia failed (non-fatal)', {
      messageId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Baixa midia da Meta Graph API e persiste no Supabase Storage.
 * Atualiza metadata da Message com a URL publica.
 * Best-effort: falha nao bloqueia o fluxo principal.
 */
export async function downloadAndStoreMetaMedia({
  mediaId,
  accessToken,
  providerMessageId,
  conversationId,
  organizationId,
  mimetype,
  fileName,
}: DownloadAndStoreMetaMediaParams): Promise<string | null> {
  try {
    // 1. Baixar binario da Meta Media API (2 steps: info -> download)
    const mediaBuffer = await downloadMetaMedia(mediaId, accessToken)

    // 2. Converter Buffer para base64 para upload no Supabase Storage
    const base64 = mediaBuffer.toString('base64')

    // 3. Upload para Supabase Storage
    const { publicUrl } = await uploadMediaToStorage({
      organizationId,
      conversationId,
      messageId: providerMessageId,
      base64,
      mimetype,
      fileName,
    })

    // 4. Atualizar metadata da mensagem com a URL publica
    const existingMessage = await db.message.findFirst({
      where: { providerMessageId },
      select: { id: true, metadata: true },
    })

    if (existingMessage) {
      const currentMetadata = (existingMessage.metadata as Record<string, unknown>) ?? {}
      const currentMedia = (currentMetadata.media as Record<string, unknown>) ?? {}

      await db.message.update({
        where: { id: existingMessage.id },
        data: {
          metadata: {
            ...currentMetadata,
            media: {
              ...currentMedia,
              url: publicUrl,
              storedInSupabase: true,
            },
          } as unknown as Prisma.InputJsonValue,
        },
      })
    }

    logger.info('Meta media downloaded and stored', {
      mediaId,
      publicUrl,
      mimetype,
    })

    return publicUrl
  } catch (error) {
    logger.warn('downloadAndStoreMetaMedia failed (non-fatal)', {
      mediaId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

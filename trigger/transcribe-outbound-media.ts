import { task, logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { checkBalance, debitCredits } from '@/_lib/billing/credit-utils'
import { calculateCreditCost } from '@/_lib/ai/pricing'
import { describeImageWithVision, IMAGE_MODEL } from './utils/describe-image'
import { describePdfWithVision } from './utils/describe-pdf'
import { revalidateConversationCache } from './lib/revalidate-cache'
import type { VisionResult } from './utils/describe-image'

// Transcrição de mídia usa modelos vision, que são mais caros
const VISION_COST_MULTIPLIER = 2

interface TranscribeOutboundMediaPayload {
  messageId: string
  conversationId: string
  organizationId: string
  /** URL pública do B2 — download no worker para evitar limite de 512KB do payload */
  mediaUrl: string
  mimetype: string
  caption?: string
}

export const transcribeOutboundMedia = task({
  id: 'transcribe-outbound-media',
  retry: { maxAttempts: 2 },
  run: async (payload: TranscribeOutboundMediaPayload) => {
    // 1. Verificar se a org tem créditos disponíveis
    const balance = await checkBalance(payload.organizationId)
    if (balance.available < 1) {
      logger.info('Skipping outbound media transcription: no credits', {
        messageId: payload.messageId,
        organizationId: payload.organizationId,
      })
      return { skipped: true, reason: 'no_credits' }
    }

    // 2. Download da mídia via B2
    const response = await fetch(payload.mediaUrl)

    if (!response.ok) {
      logger.error('Failed to download media from B2', {
        url: payload.mediaUrl,
        status: response.status,
      })
      return { skipped: true, reason: 'download_failed' }
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const base64 = buffer.toString('base64')

    // 3. Transcrever via vision AI
    let result: VisionResult

    if (payload.mimetype === 'application/pdf') {
      result = await describePdfWithVision(base64)
    } else {
      result = await describeImageWithVision(base64, payload.mimetype, payload.caption)
    }

    // 4. Debitar créditos (2x por ser vision)
    const baseCost = calculateCreditCost(IMAGE_MODEL, result.totalTokens)
    const finalCost = baseCost * VISION_COST_MULTIPLIER

    const debited = await debitCredits(
      payload.organizationId,
      finalCost,
      'Transcrição de mídia enviada (vision AI)',
      {
        messageId: payload.messageId,
        mimetype: payload.mimetype,
        totalTokens: result.totalTokens,
        multiplier: VISION_COST_MULTIPLIER,
      },
      false, // não incrementa totalMessagesUsed
    )

    if (!debited) {
      logger.warn('Failed to debit credits for media transcription (balance changed)', {
        messageId: payload.messageId,
        cost: finalCost,
      })
      // Transcrição já foi feita — salva mesmo assim para não desperdiçar a chamada
    }

    // 5. Salvar transcrição no metadata
    const message = await db.message.findUnique({
      where: { id: payload.messageId },
      select: { metadata: true },
    })

    const currentMetadata = (message?.metadata as Record<string, unknown>) ?? {}

    await db.message.update({
      where: { id: payload.messageId },
      data: {
        metadata: {
          ...currentMetadata,
          mediaTranscription: result.text,
        },
      },
    })

    await revalidateConversationCache(payload.conversationId, payload.organizationId)

    logger.info('Outbound media transcribed', {
      messageId: payload.messageId,
      mimetype: payload.mimetype,
      transcriptionLength: result.text.length,
      creditsCost: finalCost,
      debited,
    })

    return { success: true, length: result.text.length, creditsCost: finalCost }
  },
})

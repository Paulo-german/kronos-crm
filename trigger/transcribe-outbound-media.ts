import { task, logger, metadata as triggerMetadata } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { calculateCreditCost, calculateAudioCreditCost } from '@/_lib/ai/pricing'
import { describeImageWithVision, IMAGE_MODEL } from './utils/describe-image'
import { describePdfWithVision } from './utils/describe-pdf'
import { transcribeAudioFromBuffer } from './utils/transcribe-audio'
import { revalidateConversationCache } from './lib/revalidate-cache'
import { runWithCreditDebit } from './lib/debit-transcription'

// Modelos de vision são mais caros — refletido no multiplicador de créditos
const VISION_COST_MULTIPLIER = 2

// Guard de tamanho para PDFs: acima deste limite a chamada vision pode ser impraticável.
// Opção A (PR atual). Follow-up: Opção B com maxPages em describePdfWithVision.
const PDF_VISION_MAX_BYTES = 5 * 1024 * 1024 // 5 MB

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
    const { messageId, conversationId, organizationId, mediaUrl, mimetype, caption } = payload

    // Download da mídia via B2
    const response = await fetch(mediaUrl)

    if (!response.ok) {
      logger.error('Failed to download media from B2', {
        url: mediaUrl,
        status: response.status,
      })
      return { skipped: true, reason: 'download_failed' }
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const base64 = buffer.toString('base64')

    const isAudio = mimetype.startsWith('audio/')
    const isPdf = mimetype === 'application/pdf'

    let transcriptionText: string
    let finalCost = 0
    let debited = false

    if (isAudio) {
      const result = await runWithCreditDebit({
        organizationId,
        description: 'Transcrição de áudio enviado (whisper)',
        metadata: {
          messageId,
          mimetype,
          model: 'whisper-1',
          direction: 'outbound',
        },
        execute: async () => {
          const { text, duration } = await transcribeAudioFromBuffer(buffer, mimetype)
          const cost = calculateAudioCreditCost(duration)
          return { text, cost }
        },
      })

      if (result.skipped) {
        logger.info('Skipping outbound audio transcription: no credits', { messageId, organizationId })
        triggerMetadata.set('mediaType', 'audio')
        triggerMetadata.set('skipped', true)
        return { skipped: true, reason: 'no_credits' }
      }

      transcriptionText = result.text ?? ''
      finalCost = result.cost
      debited = result.debited
    } else if (isPdf) {
      // Guard de tamanho: PDFs grandes podem extrapolar custo de input tokens
      if (buffer.byteLength > PDF_VISION_MAX_BYTES) {
        logger.info('Skipping PDF vision: file too large', {
          messageId,
          sizeBytes: buffer.byteLength,
          limitBytes: PDF_VISION_MAX_BYTES,
        })
        triggerMetadata.set('mediaType', 'pdf')
        triggerMetadata.set('skipped', true)
        triggerMetadata.set('skipReason', 'file_too_large')
        return { skipped: true, reason: 'file_too_large' }
      }

      const result = await runWithCreditDebit({
        organizationId,
        description: 'Transcrição de PDF enviado (vision AI)',
        metadata: {
          messageId,
          mimetype,
          multiplier: VISION_COST_MULTIPLIER,
          direction: 'outbound',
        },
        execute: async () => {
          const visionResult = await describePdfWithVision(base64)
          const cost = calculateCreditCost(IMAGE_MODEL, visionResult.totalTokens) * VISION_COST_MULTIPLIER
          return { text: visionResult.text, cost }
        },
      })

      if (result.skipped) {
        logger.info('Skipping outbound PDF transcription: no credits', { messageId, organizationId })
        triggerMetadata.set('mediaType', 'pdf')
        triggerMetadata.set('skipped', true)
        return { skipped: true, reason: 'no_credits' }
      }

      transcriptionText = result.text ?? ''
      finalCost = result.cost
      debited = result.debited
    } else {
      // Imagem (default)
      const result = await runWithCreditDebit({
        organizationId,
        description: 'Transcrição de mídia enviada (vision AI)',
        metadata: {
          messageId,
          mimetype,
          multiplier: VISION_COST_MULTIPLIER,
          direction: 'outbound',
        },
        execute: async () => {
          const visionResult = await describeImageWithVision(base64, mimetype, caption)
          const cost = calculateCreditCost(IMAGE_MODEL, visionResult.totalTokens) * VISION_COST_MULTIPLIER
          return { text: visionResult.text, cost }
        },
      })

      if (result.skipped) {
        logger.info('Skipping outbound image transcription: no credits', { messageId, organizationId })
        triggerMetadata.set('mediaType', 'image')
        triggerMetadata.set('skipped', true)
        return { skipped: true, reason: 'no_credits' }
      }

      transcriptionText = result.text ?? ''
      finalCost = result.cost
      debited = result.debited
    }

    // Salvar transcrição no metadata da mensagem
    const message = await db.message.findUnique({
      where: { id: messageId },
      select: { metadata: true },
    })

    const currentMetadata = (message?.metadata as Record<string, unknown>) ?? {}

    await db.message.update({
      where: { id: messageId },
      data: {
        metadata: {
          ...currentMetadata,
          mediaTranscription: transcriptionText,
        },
      },
    })

    await revalidateConversationCache(conversationId, organizationId)

    const mediaType = isAudio ? 'audio' : isPdf ? 'pdf' : 'image'

    logger.info('Outbound media transcribed', {
      messageId,
      conversationId,
      organizationId,
      mimetype,
      direction: 'outbound',
      mediaType,
      transcriptionLength: transcriptionText.length,
      creditsCost: finalCost,
      debited,
    })

    triggerMetadata.set('mediaType', mediaType)
    triggerMetadata.set('cost', finalCost)
    triggerMetadata.set('debited', debited)

    return { success: true, length: transcriptionText.length, creditsCost: finalCost }
  },
})

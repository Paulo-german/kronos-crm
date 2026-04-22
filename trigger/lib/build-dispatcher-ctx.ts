import { logger, metadata as triggerMetadata } from '@trigger.dev/sdk/v3'
import { resolveCanonicalAgentVersion } from '../../app/_lib/agent/agent-version'
import { updateActiveTrace } from '@langfuse/tracing'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { resolveEvolutionCredentialsByInstanceName } from '@/_lib/evolution/resolve-credentials'
import { routeConversation } from './route-conversation'
import { checkBusinessHours } from '@/_lib/agent/check-business-hours'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'
import type { GroupPromptContext } from '../build-system-prompt'
import {
  createConversationEvent,
} from './create-conversation-event'
import type {
  InfoSubtype,
  ProcessingErrorSubtype,
} from '@/_lib/conversation-events/types'
import { transcribeAudio } from '../utils/transcribe-audio'
import { transcribeImage } from '../utils/transcribe-image'
import { downloadAndStoreMedia } from '../utils/download-and-store-media'
import { createExecutionTracker } from './execution-tracker'
import { revalidateConversationCache } from './revalidate-cache'
import type { NormalizedWhatsAppMessage } from '@/_lib/evolution/types'
import type { DispatcherCtx } from '../dispatcher-types'

export interface ProcessAgentMessagePayload {
  message: NormalizedWhatsAppMessage
  agentId: string
  conversationId: string
  organizationId: string
  debounceTimestamp: number
  // Campos adicionais para modo de grupo (optional para manter backward compatibility)
  requiresRouting?: boolean
  groupId?: string | null
  // Flag interna: quando true, router-lite já resolveu o agentId e podemos pular routing
  skipRouting?: boolean
}

// Registra execução mínima para early exits que ocorrem antes do tracker ser criado
async function createMinimalExecution(params: {
  agentId: string | null
  agentGroupId?: string | null
  organizationId: string
  conversationId: string
  triggerMessageId: string
  reason: string
  errorMessage?: string
}): Promise<void> {
  try {
    const now = new Date()
    await db.agentExecution.create({
      data: {
        id: crypto.randomUUID(),
        agentId: params.agentId,
        agentGroupId: params.agentGroupId ?? null,
        organizationId: params.organizationId,
        conversationId: params.conversationId,
        triggerMessageId: params.triggerMessageId,
        status: 'SKIPPED',
        startedAt: now,
        completedAt: now,
        durationMs: 0,
        errorMessage: params.errorMessage ?? params.reason,
      },
    })
  } catch (error) {
    logger.warn('Failed to persist minimal execution', {
      reason: params.reason,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export type BuildDispatcherCtxResult =
  | { ctx: DispatcherCtx }
  | { skipped: true; reason: string }

export async function buildDispatcherCtx(
  payload: ProcessAgentMessagePayload,
  triggerCtx: { attempt: { number: number } },
): Promise<BuildDispatcherCtxResult> {
  const {
    message,
    agentId,
    conversationId,
    organizationId,
    debounceTimestamp,
    requiresRouting,
    groupId,
    skipRouting,
  } = payload

  const attemptNumber = triggerCtx.attempt.number

  const logCtx = { msgId: message.messageId, conversationId, agentId, attempt: attemptNumber }
  const log = (
    step: string,
    outcome: string,
    extra?: Record<string, unknown>,
  ) => logger.info(`[agent] ${step} → ${outcome}`, { ...logCtx, ...extra })

  log('step:0 task_started', 'PASS', {
    type: message.type,
    remoteJid: message.remoteJid,
    organizationId,
  })

  triggerMetadata.set('conversationId', conversationId)
  triggerMetadata.set('agentId', agentId)
  triggerMetadata.set('organizationId', organizationId)
  triggerMetadata.set('messageType', message.type)
  triggerMetadata.set('attemptNumber', attemptNumber)

  let effectiveAgentId = agentId

  const traceTags: string[] = [
    message.provider === 'simulator' ? 'simulator' : 'whatsapp',
    'agent',
  ]

  updateActiveTrace({
    sessionId: conversationId,
    userId: organizationId,
    tags: traceTags,
    metadata: { agentId, organizationId, messageType: message.type },
  })

  const finalizeTrace = (
    outcome: string,
    extra?: { metadata?: Record<string, unknown> },
  ) => {
    triggerMetadata.set('outcome', outcome)
    updateActiveTrace({
      output: { outcome },
      tags: [...traceTags],
      metadata: { outcome, organizationId, ...extra?.metadata },
    })
  }

  const taskStartMs = Date.now()

  let debounceCheckPassed = false
  let debounceCheckWarning: string | undefined

  try {
    // -----------------------------------------------------------------------
    // 1. Debounce check
    // -----------------------------------------------------------------------
    try {
      const currentTimestamp = await redis.get(`debounce:${conversationId}`)
      if (currentTimestamp && currentTimestamp !== String(debounceTimestamp)) {
        log('step:1 debounce_check', 'EXIT', {
          reason: 'newer_message_exists',
          myTimestamp: debounceTimestamp,
          currentTimestamp,
        })
        finalizeTrace('skipped:debounce')
        return { skipped: true, reason: 'debounce' }
      }
      log('step:1 debounce_check', 'PASS')
      debounceCheckPassed = true
    } catch (error) {
      log('step:1 debounce_check', 'PASS', { warning: 'redis_failed_continuing' })
      debounceCheckPassed = true
      debounceCheckWarning = 'redis_failed_continuing'
      logger.warn('Redis debounce check failed, continuing', { ...logCtx, error })
    }

    // -----------------------------------------------------------------------
    // 1b. Router Classification — executa apenas quando requiresRouting=true e
    // skipRouting=false (router-lite ainda não resolveu o worker)
    // -----------------------------------------------------------------------
    if (requiresRouting && groupId && !skipRouting) {
      log('step:1b router_classification', 'PASS', { groupId })

      const routerMessageHistory = await db.message.findMany({
        where: { conversationId, isArchived: false },
        orderBy: { createdAt: 'asc' },
        take: 50,
        select: { role: true, content: true },
      })

      let routerResult: Awaited<ReturnType<typeof routeConversation>>

      try {
        routerResult = await routeConversation({
          groupId,
          conversationId,
          organizationId,
          messageHistory: routerMessageHistory,
        })
      } catch (routerError) {
        const errorMessage =
          routerError instanceof Error ? routerError.message : String(routerError)
        const isNoCredits = errorMessage === 'NO_CREDITS'

        log('step:1b router_classification', 'EXIT', {
          reason: isNoCredits ? 'no_credits_for_router' : 'router_error',
          error: errorMessage,
        })

        await createMinimalExecution({
          agentId: null,
          agentGroupId: groupId,
          organizationId,
          conversationId,
          triggerMessageId: message.messageId,
          reason: isNoCredits ? 'router_no_credits' : 'router_failed',
          errorMessage,
        })

        if (!isNoCredits) {
          await createConversationEvent({
            conversationId,
            type: 'PROCESSING_ERROR',
            content: 'Falha ao classificar a conversa pelo agente roteador.',
            metadata: {
              subtype: 'ROUTER_FAILED' satisfies ProcessingErrorSubtype,
              error: errorMessage,
            },
          })
          await revalidateConversationCache(conversationId, organizationId)
        }

        finalizeTrace('skipped:router_failed', { metadata: { error: errorMessage } })
        return { skipped: true, reason: 'router_failed' }
      }

      if (!routerResult) {
        log('step:1b router_classification', 'EXIT', { reason: 'no_suitable_worker' })
        await createMinimalExecution({
          agentId: null,
          agentGroupId: groupId,
          organizationId,
          conversationId,
          triggerMessageId: message.messageId,
          reason: 'no_suitable_worker',
        })
        finalizeTrace('skipped:no_suitable_worker')
        return { skipped: true, reason: 'no_suitable_worker' }
      }

      effectiveAgentId = routerResult.targetAgentId

      await db.conversation.update({
        where: { id: conversationId },
        data: { activeAgentId: effectiveAgentId },
      })

      await createConversationEvent({
        conversationId,
        type: 'INFO',
        content: `Agente "${routerResult.workerName}" atribuído à conversa`,
        metadata: {
          subtype: 'ROUTER_ASSIGNED' satisfies InfoSubtype,
          targetAgentId: routerResult.targetAgentId,
          confidence: routerResult.confidence,
          reasoning: routerResult.reasoning,
        },
      })

      log('step:1b router_classified', 'PASS', {
        targetAgentId: routerResult.targetAgentId,
        workerName: routerResult.workerName,
        confidence: routerResult.confidence,
      })
    }

    // -----------------------------------------------------------------------
    // Post-routing housekeeping — roda sempre que a conversa tem worker
    // resolvido via routing, independente de quem fez o routing
    // (buildDispatcherCtx OU router-lite via skipRouting).
    // -----------------------------------------------------------------------
    if (requiresRouting && groupId) {
      triggerMetadata.set('effectiveAgentId', effectiveAgentId)
      traceTags.push('routed')

      // Re-emit updateActiveTrace pra refletir a tag 'routed' no Langfuse
      // (o update inicial nas linhas ~120 aconteceu antes do routing)
      updateActiveTrace({
        sessionId: conversationId,
        userId: organizationId,
        tags: traceTags,
        metadata: { agentId: effectiveAgentId, organizationId, messageType: message.type },
      })

      // Business hours check do worker resolvido
      const resolvedWorker = await db.agent.findUnique({
        where: { id: effectiveAgentId },
        select: {
          businessHoursEnabled: true,
          businessHoursTimezone: true,
          businessHoursConfig: true,
          outOfHoursMessage: true,
        },
      })

      if (resolvedWorker?.businessHoursEnabled && resolvedWorker.businessHoursConfig) {
        const isWithinHours = checkBusinessHours(
          resolvedWorker.businessHoursTimezone,
          resolvedWorker.businessHoursConfig as BusinessHoursConfig,
        )

        if (!isWithinHours) {
          log('step:1b router_worker_ooh', 'EXIT', {
            reason: 'outside_business_hours',
            workerId: effectiveAgentId,
          })
          await createMinimalExecution({
            agentId: effectiveAgentId,
            agentGroupId: groupId,
            organizationId,
            conversationId,
            triggerMessageId: message.messageId,
            reason: 'outside_business_hours',
          })
          finalizeTrace('skipped:outside_business_hours', { metadata: { workerId: effectiveAgentId } })
          return { skipped: true, reason: 'outside_business_hours' }
        }
      }
    }

    const tracker = createExecutionTracker({
      agentId: effectiveAgentId,
      organizationId,
      conversationId,
      triggerMessageId: message.messageId,
    })

    if (debounceCheckPassed) {
      tracker.addStep({
        type: 'DEBOUNCE_CHECK',
        status: 'PASSED',
        output: debounceCheckWarning ? { warning: debounceCheckWarning } : undefined,
      })
    }

    if (requiresRouting && groupId) {
      tracker.addStep({
        type: 'ROUTER_CLASSIFICATION',
        status: 'PASSED',
        output: { resolvedWorkerId: effectiveAgentId },
      })
    }

    // -----------------------------------------------------------------------
    // 2b. Se áudio, transcrever com Whisper
    // -----------------------------------------------------------------------
    let messageText = message.text
    if (message.type === 'audio' && message.media) {
      log('step:3a audio_transcription', 'PASS', {
        seconds: message.media.seconds,
        provider: message.provider,
      })

      let transcription: string

      if (message.provider === 'meta_cloud') {
        const { downloadMetaMedia } = await import('@/_lib/meta/download-meta-media')
        const metaInbox = await db.inbox.findFirst({
          where: { metaPhoneNumberId: message.instanceName },
          select: { metaAccessToken: true },
        })

        if (metaInbox?.metaAccessToken) {
          const audioBuffer = await downloadMetaMedia(
            message.media.url,
            metaInbox.metaAccessToken,
          )
          const { transcribeAudioFromBuffer } = await import('../utils/transcribe-audio')
          transcription = await transcribeAudioFromBuffer(audioBuffer, message.media.mimetype)
        } else {
          log('step:3a audio_transcription', 'SKIP', { reason: 'no_meta_access_token' })
          transcription = '[Áudio não transcrito — token de acesso não disponível]'
        }
      } else if (message.provider === 'z_api') {
        const audioResponse = await fetch(message.media.url)
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())
        const { transcribeAudioFromBuffer } = await import('../utils/transcribe-audio')
        transcription = await transcribeAudioFromBuffer(audioBuffer, message.media.mimetype)
      } else {
        try {
          const evolutionCredentials = await resolveEvolutionCredentialsByInstanceName(message.instanceName)
          transcription = await transcribeAudio(
            message.instanceName,
            message.messageId,
            evolutionCredentials,
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)

          logger.error('Evolution audio transcription failed, using fallback', {
            instanceName: message.instanceName,
            messageId: message.messageId,
            error: errorMessage,
            provider: message.provider,
          })

          updateActiveTrace({
            tags: ['media-transcription-failed'],
            metadata: { transcriptionError: errorMessage, mediaType: 'audio' },
          })

          transcription = '[Áudio não transcrito — erro ao buscar mídia]'
        }
      }

      messageText = transcription
      log('step:3a audio_transcribed', 'PASS', { length: transcription.length })
      tracker.addStep({
        type: 'AUDIO_TRANSCRIPTION',
        status: 'PASSED',
        output: { length: transcription.length },
      })

      await db.message.updateMany({
        where: { providerMessageId: message.messageId },
        data: { content: transcription },
      })
    }

    // -----------------------------------------------------------------------
    // 2c. Download de mídia + contexto LLM para image/document
    // -----------------------------------------------------------------------
    if (
      message.media &&
      (message.type === 'image' || message.type === 'document' || message.type === 'audio')
    ) {
      log('step:3b media_download', 'PASS', {
        type: message.type,
        mimetype: message.media.mimetype,
        provider: message.provider,
      })

      if (message.provider === 'meta_cloud') {
        const metaInbox = await db.inbox.findFirst({
          where: { metaPhoneNumberId: message.instanceName },
          select: { metaAccessToken: true },
        })

        if (metaInbox?.metaAccessToken) {
          const { downloadAndStoreMetaMedia } = await import('../utils/download-and-store-media')
          await downloadAndStoreMetaMedia({
            mediaId: message.media.url,
            accessToken: metaInbox.metaAccessToken,
            providerMessageId: message.messageId,
            conversationId,
            organizationId,
            mimetype: message.media.mimetype,
            fileName: message.media.fileName,
          }).catch((error) => {
            logger.warn('Meta media download failed (non-fatal)', {
              ...logCtx,
              error: error instanceof Error ? error.message : String(error),
            })
          })
        }
      } else if (message.provider === 'z_api') {
        const { downloadAndStoreFromUrl } = await import('../utils/download-and-store-media')
        await downloadAndStoreFromUrl({
          mediaUrl: message.media.url,
          providerMessageId: message.messageId,
          conversationId,
          organizationId,
          mimetype: message.media.mimetype,
          fileName: message.media.fileName,
        }).catch((error) => {
          logger.warn('Z-API media download failed (non-fatal)', {
            ...logCtx,
            error: error instanceof Error ? error.message : String(error),
          })
        })
      } else {
        const evolutionCredentialsForMedia = await resolveEvolutionCredentialsByInstanceName(message.instanceName).catch(() => null)
        await downloadAndStoreMedia({
          instanceName: message.instanceName,
          messageId: message.messageId,
          providerMessageId: message.messageId,
          conversationId,
          organizationId,
          mimetype: message.media.mimetype,
          fileName: message.media.fileName,
          apiUrl: evolutionCredentialsForMedia?.apiUrl,
          apiKey: evolutionCredentialsForMedia?.apiKey,
        }).catch((error) => {
          logger.warn('Media download failed (non-fatal)', {
            ...logCtx,
            error: error instanceof Error ? error.message : String(error),
          })
        })
      }

      tracker.addStep({
        type: 'MEDIA_DOWNLOAD',
        status: 'PASSED',
        output: { type: message.type, mimetype: message.media.mimetype },
      })
    }

    // Para image: transcrever com visão; document: placeholder
    if (message.type === 'image' && message.media) {
      log('step:3c image_transcription', 'PASS', {
        hasCaption: !!message.text,
        provider: message.provider,
      })
      try {
        let description: string

        if (message.provider === 'meta_cloud') {
          const { downloadMetaMedia } = await import('@/_lib/meta/download-meta-media')
          const metaInboxForImage = await db.inbox.findFirst({
            where: { metaPhoneNumberId: message.instanceName },
            select: { metaAccessToken: true },
          })

          if (!metaInboxForImage?.metaAccessToken) {
            throw new Error('Meta access token not found for image transcription')
          }

          const imageBuffer = await downloadMetaMedia(
            message.media.url,
            metaInboxForImage.metaAccessToken,
          )
          const imageBase64 = imageBuffer.toString('base64')

          description = await transcribeImage(
            message.instanceName,
            message.messageId,
            message.text ?? undefined,
            { base64: imageBase64, mimetype: message.media.mimetype },
          )
        } else if (message.provider === 'z_api') {
          const imageResponse = await fetch(message.media.url)
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
          const imageBase64 = imageBuffer.toString('base64')

          description = await transcribeImage(
            message.instanceName,
            message.messageId,
            message.text ?? undefined,
            { base64: imageBase64, mimetype: message.media.mimetype },
          )
        } else {
          const evolutionCredentialsForImage = await resolveEvolutionCredentialsByInstanceName(message.instanceName).catch(() => null)
          description = await transcribeImage(
            message.instanceName,
            message.messageId,
            message.text ?? undefined,
            undefined,
            evolutionCredentialsForImage ?? undefined,
          )
        }

        const caption = message.text ? `\nLegenda do cliente: "${message.text}"` : ''
        messageText = `[Imagem enviada pelo cliente — descrição: ${description}${caption}]`
        log('step:3c image_transcribed', 'PASS', { length: description.length })
        tracker.addStep({
          type: 'IMAGE_TRANSCRIPTION',
          status: 'PASSED',
          output: { length: description.length },
        })
        await db.message.updateMany({
          where: { providerMessageId: message.messageId },
          data: { content: messageText },
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        logger.error('Image transcription failed, using placeholder', {
          ...logCtx,
          error: errorMessage,
          provider: message.provider,
          messageId: message.messageId,
          mimetype: message.media?.mimetype,
        })

        updateActiveTrace({
          tags: ['media-transcription-failed'],
          metadata: { transcriptionError: errorMessage, mediaType: 'image' },
        })

        const caption = message.text ? ` com legenda: "${message.text}"` : ''
        messageText = `[O cliente enviou uma imagem${caption}]`
        await db.message.updateMany({
          where: { providerMessageId: message.messageId },
          data: { content: messageText },
        })
        tracker.addStep({
          type: 'IMAGE_TRANSCRIPTION',
          status: 'FAILED',
          output: { error: errorMessage },
        })
      }
    } else if (message.type === 'image') {
      const caption = message.text ? ` com legenda: "${message.text}"` : ''
      messageText = `[O cliente enviou uma imagem${caption}]`
    } else if (message.type === 'document' && message.media) {
      const fileName = message.media.fileName ?? 'arquivo'
      const mimetype = message.media.mimetype ?? ''
      const caption = message.text ? `\nLegenda do cliente: "${message.text}"` : ''

      log('step:3d document_processing', 'PASS', {
        mimetype,
        fileName,
        provider: message.provider,
      })

      try {
        // 1. Obter base64 por provider (espelha pattern do image branch)
        let base64: string
        let resolvedMimetype: string

        if (message.provider === 'meta_cloud') {
          const { downloadMetaMedia } = await import('@/_lib/meta/download-meta-media')
          const metaInboxForDocument = await db.inbox.findFirst({
            where: { metaPhoneNumberId: message.instanceName },
            select: { metaAccessToken: true },
          })

          if (!metaInboxForDocument?.metaAccessToken) {
            throw new Error('Meta access token not found for document processing')
          }

          const buffer = await downloadMetaMedia(message.media.url, metaInboxForDocument.metaAccessToken)
          base64 = buffer.toString('base64')
          resolvedMimetype = mimetype
        } else if (message.provider === 'z_api') {
          const response = await fetch(message.media.url)
          if (!response.ok) {
            throw new Error(`Z-API document fetch failed (${response.status})`)
          }
          const buffer = Buffer.from(await response.arrayBuffer())
          base64 = buffer.toString('base64')
          resolvedMimetype = mimetype
        } else {
          const evolutionCredentialsForDocument = await resolveEvolutionCredentialsByInstanceName(message.instanceName).catch(() => null)
          const apiUrl = evolutionCredentialsForDocument?.apiUrl ?? process.env.EVOLUTION_API_URL
          const apiKey = evolutionCredentialsForDocument?.apiKey ?? process.env.EVOLUTION_API_KEY

          if (!apiUrl || !apiKey) {
            throw new Error('EVOLUTION_API_URL and EVOLUTION_API_KEY must be configured')
          }

          const response = await fetch(
            `${apiUrl}/chat/getBase64FromMediaMessage/${message.instanceName}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', apikey: apiKey },
              body: JSON.stringify({ message: { key: { id: message.messageId } } }),
            },
          )

          if (!response.ok) {
            const errorBody = await response.text().catch(() => 'unknown')
            throw new Error(
              `Evolution getBase64FromMediaMessage failed (${response.status}): ${errorBody}`,
            )
          }

          const data = (await response.json()) as { base64?: string; mimetype?: string }

          if (!data.base64) {
            throw new Error('Evolution returned empty base64 for document')
          }

          base64 = data.base64
          resolvedMimetype = data.mimetype ?? mimetype
        }

        // 2. Dispatch por mimetype
        if (resolvedMimetype.startsWith('image/')) {
          const { describeImageWithVision } = await import('../utils/describe-image')
          const result = await describeImageWithVision(base64, resolvedMimetype, message.text ?? undefined)
          messageText = `[Documento de imagem enviado pelo cliente (${fileName}) — descrição: ${result.text}${caption}]`
          log('step:3d document_image_described', 'PASS', { length: result.text.length })
        } else if (resolvedMimetype === 'application/pdf') {
          const { extractPdfText, PDF_NO_TEXT_EXTRACTED } = await import('@/_lib/media/extract-pdf-text')
          const extracted = await extractPdfText(base64)
          if (extracted === PDF_NO_TEXT_EXTRACTED) {
            messageText = `[O cliente enviou um PDF escaneado (${fileName}) — sem texto extraível. Peça para reenviar como foto ou descrever o conteúdo.${caption}]`
            log('step:3d pdf_no_text_extracted', 'PASS', { fileName })
          } else {
            messageText = `[Conteúdo do PDF enviado pelo cliente (${fileName}):\n${extracted}${caption}]`
            log('step:3d pdf_text_extracted', 'PASS', { length: extracted.length })
          }
        } else {
          messageText = `[O cliente enviou um documento: "${fileName}"${caption}]`
          log('step:3d document_unsupported_mimetype', 'PASS', { mimetype: resolvedMimetype })
        }

        await db.message.updateMany({
          where: { providerMessageId: message.messageId },
          data: { content: messageText },
        })

        tracker.addStep({
          type: 'IMAGE_TRANSCRIPTION',
          status: 'PASSED',
          output: { mimetype: resolvedMimetype, length: messageText.length, fileName },
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        logger.error('Document processing failed, using placeholder', {
          ...logCtx,
          error: errorMessage,
          provider: message.provider,
          messageId: message.messageId,
          mimetype,
          fileName,
        })

        updateActiveTrace({
          tags: ['media-transcription-failed'],
          metadata: { transcriptionError: errorMessage, mediaType: 'document', mimetype },
        })

        messageText = `[O cliente enviou um documento: "${fileName}"${caption}]`
        await db.message.updateMany({
          where: { providerMessageId: message.messageId },
          data: { content: messageText },
        })

        tracker.addStep({
          type: 'IMAGE_TRANSCRIPTION',
          status: 'FAILED',
          output: { error: errorMessage, fileName, mimetype },
        })
      }
    } else if (message.type === 'document') {
      const fileName = message.media?.fileName ?? 'arquivo'
      messageText = `[O cliente enviou um documento: "${fileName}"]`
    }

    // -----------------------------------------------------------------------
    // 3. Context loading — prompt dinâmico + histórico + dados da conversa
    // -----------------------------------------------------------------------
    log('step:4 context_loading', 'PASS')

    // Montar contexto do grupo para injetar seção de transferência no prompt
    let groupPromptContext: GroupPromptContext | undefined
    if (groupId) {
      const groupData = await db.agentGroup.findUnique({
        where: { id: groupId },
        select: {
          members: {
            include: {
              agent: { select: { id: true, name: true, isActive: true } },
            },
          },
        },
      })

      if (groupData) {
        const activeGroupWorkers = groupData.members
          .filter((member) => member.isActive)
          .map((member) => ({
            agentId: member.agentId,
            name: member.agent.name,
            scopeLabel: member.scopeLabel,
          }))

        groupPromptContext = {
          groupId,
          workers: activeGroupWorkers,
          currentAgentId: effectiveAgentId,
        }
      }
    }

    // -----------------------------------------------------------------------
    // 3a. Lookup de agentVersion com query isolada (~1ms)
    // -----------------------------------------------------------------------
    const { agentVersion } = await db.agent.findUniqueOrThrow({
      where: { id: effectiveAgentId },
      select: { agentVersion: true },
    })

    const dispatcherCtx: DispatcherCtx = {
      message,
      conversationId,
      organizationId,
      effectiveAgentId,
      agentVersion: resolveCanonicalAgentVersion(agentVersion),
      tracker,
      log,
      baseLogContext: logCtx,
      taskStartMs,
      traceTags,
      finalizeTrace,
      messageText: messageText ?? '',
      groupPromptContext,
    }

    return { ctx: dispatcherCtx }
  } catch (unexpectedError) {
    const errorMessage = unexpectedError instanceof Error
      ? unexpectedError.message
      : String(unexpectedError)
    // Propagar o erro para a task-pai executar seus próprios retries e onFailure
    throw unexpectedError
  }
}

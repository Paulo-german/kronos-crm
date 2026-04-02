import { task, tasks, logger, metadata as triggerMetadata } from '@trigger.dev/sdk/v3'
import { generateText, stepCountIs } from 'ai'
import { observe, updateActiveTrace } from '@langfuse/tracing'
import { getModel } from '@/_lib/ai'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { debitCredits, refundCredits } from '@/_lib/billing/credit-utils'
import {
  estimateMaxCost,
  calculateCreditCost,
} from '@/_lib/billing/model-pricing'
import {
  sendWhatsAppMessage,
  sendPresence,
} from '@/_lib/evolution/send-message'
import { resolveEvolutionCredentialsByInstanceName } from '@/_lib/evolution/resolve-credentials'
import { sendMetaTextMessage } from '@/_lib/meta/send-meta-message'
import { buildSystemPrompt } from './build-system-prompt'
import { buildToolSet } from './tools'
import { routeConversation } from './lib/route-conversation'
import { checkBusinessHours } from '@/_lib/agent/check-business-hours'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'
import type { GroupPromptContext } from './build-system-prompt'
import type { GroupToolConfig } from './tools'
import { langfuseTracer, flushLangfuse } from './lib/langfuse'
import {
  createConversationEvent,
  createToolEvents,
} from './lib/create-conversation-event'
import { transcribeAudio } from './utils/transcribe-audio'
import { AUTO_REOPEN_FIELDS } from '@/_lib/conversation/auto-reopen'
import { transcribeImage } from './utils/transcribe-image'
import { downloadAndStoreMedia } from './utils/download-and-store-media'
import { getFollowUpsForStep } from '@/_data-access/follow-up/get-follow-ups-for-step'
import { createExecutionTracker } from './lib/execution-tracker'
import type { ToolContext } from './tools/types'
import type { NormalizedWhatsAppMessage } from '@/_lib/evolution/types'

async function revalidateConversationCache(
  conversationId: string,
  organizationId?: string,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  const secret = process.env.INTERNAL_API_SECRET

  if (!appUrl || !secret) {
    logger.warn(
      'Skipping conversation cache revalidation: missing NEXT_PUBLIC_APP_URL or INTERNAL_API_SECRET',
    )
    return
  }

  const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`

  const url = `${baseUrl}/api/inbox/revalidate`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ conversationId, organizationId }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      logger.warn('Conversation cache revalidation returned error', {
        conversationId,
        status: response.status,
        body: text.slice(0, 200),
        url,
      })
    } else {
      logger.info('Conversation cache revalidated', {
        conversationId,
        status: response.status,
      })
    }
  } catch (error) {
    logger.warn('Conversation cache revalidation failed (network)', {
      conversationId,
      url,
      error,
    })
  }
}

const MESSAGE_HISTORY_LIMIT = 50
const SUMMARIZATION_THRESHOLD = 12
const KEEP_RECENT_MESSAGES = 3
const SUMMARIZATION_MODEL = 'openai/gpt-4o-mini'

export interface ProcessAgentMessagePayload {
  message: NormalizedWhatsAppMessage
  agentId: string
  conversationId: string
  organizationId: string
  debounceTimestamp: number
  // Campos adicionais para modo de grupo (optional para manter backward compatibility)
  requiresRouting?: boolean // true = precisa rodar o router antes de processar
  groupId?: string | null // ID do grupo (para buscar config do router + workers)
}

// Helper — registra execução mínima para early exits que ocorrem antes do tracker ser criado
async function createMinimalExecution(params: {
  agentId: string | null
  agentGroupId?: string | null
  organizationId: string
  conversationId: string
  triggerMessageId: string
  reason: string
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
        errorMessage: params.reason,
      },
    })
  } catch (error) {
    logger.warn('Failed to persist minimal execution', {
      reason: params.reason,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export const processAgentMessage = task({
  id: 'process-agent-message',
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: ProcessAgentMessagePayload) => {
    return observe(
      async () => {
        const {
          message,
          agentId,
          conversationId,
          organizationId,
          debounceTimestamp,
          requiresRouting,
          groupId,
        } = payload

        // Helper de log — sempre inclui msgId + conversationId para rastreio
        const ctx = { msgId: message.messageId, conversationId, agentId }
        const log = (
          step: string,
          outcome: 'PASS' | 'EXIT' | 'SKIP',
          extra?: Record<string, unknown>,
        ) => logger.info(`[agent] ${step} → ${outcome}`, { ...ctx, ...extra })

        log('step:0 task_started', 'PASS', {
          type: message.type,
          remoteJid: message.remoteJid,
          organizationId,
        })

        // Trigger.dev metadata — visível no dashboard para filtragem/debug
        triggerMetadata.set('conversationId', conversationId)
        triggerMetadata.set('agentId', agentId)
        triggerMetadata.set('organizationId', organizationId)
        triggerMetadata.set('messageType', message.type)

        // effectiveAgentId começa como o agentId do payload.
        // No modo de grupo com requiresRouting = true, é sobrescrito pelo worker resolvido.
        // O tracker do worker é criado APÓS o routing para usar o ID correto.
        let effectiveAgentId = agentId

        // Tags acumulativas para o trace Langfuse (updateActiveTrace faz replace, não merge)
        const traceTags: string[] = ['whatsapp', 'agent']

        updateActiveTrace({
          sessionId: conversationId,
          userId: organizationId,
          tags: traceTags,
          metadata: { agentId, messageType: message.type },
        })

        const taskStartMs = Date.now()

        // Flags de steps pré-routing para injetar no tracker após sua criação
        // O tracker precisa ser criado com effectiveAgentId (resolvido pelo router)
        let debounceCheckPassed = false
        let debounceCheckWarning: string | undefined

        try {
          // -----------------------------------------------------------------------
          // 1. Debounce check
          // -----------------------------------------------------------------------
          try {
            const currentTimestamp = await redis.get(
              `debounce:${conversationId}`,
            )
            if (
              currentTimestamp &&
              currentTimestamp !== String(debounceTimestamp)
            ) {
              log('step:1 debounce_check', 'EXIT', {
                reason: 'newer_message_exists',
                myTimestamp: debounceTimestamp,
                currentTimestamp,
              })
              // Tracker ainda não existe — skip direto sem registrar
              return { skipped: true, reason: 'debounce' }
            }
            log('step:1 debounce_check', 'PASS')
            debounceCheckPassed = true
          } catch (error) {
            log('step:1 debounce_check', 'PASS', {
              warning: 'redis_failed_continuing',
            })
            debounceCheckPassed = true
            debounceCheckWarning = 'redis_failed_continuing'
            logger.warn('Redis debounce check failed, continuing', {
              ...ctx,
              error,
            })
          }

          // -----------------------------------------------------------------------
          // 2. (Credit check movido para após context loading — precisa do modelId)
          // -----------------------------------------------------------------------

          // -----------------------------------------------------------------------
          // 1b. Router Classification — resolve worker quando inbox usa AgentGroup
          // Executa apenas quando requiresRouting = true (conversa nova ou sem worker ativo)
          // -----------------------------------------------------------------------
          if (requiresRouting && groupId) {
            log('step:1b router_classification', 'PASS', { groupId })

            // Carregar histórico da conversa para o router classificar o contexto completo
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
              const isNoCredits =
                routerError instanceof Error && routerError.message === 'NO_CREDITS'

              log('step:1b router_classification', 'EXIT', {
                reason: isNoCredits ? 'no_credits_for_router' : 'router_error',
                error: routerError instanceof Error ? routerError.message : String(routerError),
              })
              await createMinimalExecution({
                agentId: null,
                agentGroupId: groupId,
                organizationId,
                conversationId,
                triggerMessageId: message.messageId,
                reason: isNoCredits ? 'router_no_credits' : 'router_failed',
              })
              return { skipped: true, reason: 'router_failed' }
            }

            if (!routerResult) {
              log('step:1b router_classification', 'EXIT', {
                reason: 'no_suitable_worker',
              })
              await createMinimalExecution({
                agentId: null,
                agentGroupId: groupId,
                organizationId,
                conversationId,
                triggerMessageId: message.messageId,
                reason: 'no_suitable_worker',
              })
              return { skipped: true, reason: 'no_suitable_worker' }
            }

            effectiveAgentId = routerResult.targetAgentId

            // Persistir worker ativo na conversa para próximas mensagens
            await db.conversation.update({
              where: { id: conversationId },
              data: { activeAgentId: effectiveAgentId },
            })

            // Registrar evento informativo visível ao usuário
            await createConversationEvent({
              conversationId,
              type: 'INFO',
              content: `Agente "${routerResult.workerName}" atribuído à conversa`,
              metadata: {
                subtype: 'ROUTER_ASSIGNED',
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

            triggerMetadata.set('effectiveAgentId', effectiveAgentId)
            traceTags.push('routed')

            // Business hours check DO WORKER resolvido pelo router
            // O router opera 24h, mas o worker individual pode ter restrições de horário
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
                return { skipped: true, reason: 'outside_business_hours' }
              }
            }
          }

          // Criar tracker com effectiveAgentId (já resolvido pelo router se necessário)
          // e injetar os steps pré-routing acumulados até aqui
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

          // Se houve routing, registrar o resultado no tracker do worker
          if (requiresRouting && groupId && effectiveAgentId !== agentId) {
            tracker.addStep({
              type: 'ROUTER_CLASSIFICATION',
              status: 'PASSED',
              output: { resolvedWorkerId: effectiveAgentId },
            })
          }

          // -----------------------------------------------------------------------
          // 2b. Se áudio, transcrever com Whisper
          // Para Meta Cloud: o media.url armazena o mediaId — download separado necessario
          // -----------------------------------------------------------------------
          let messageText = message.text
          if (message.type === 'audio' && message.media) {
            log('step:3a audio_transcription', 'PASS', {
              seconds: message.media.seconds,
              provider: message.provider,
            })

            let transcription: string

            if (message.provider === 'meta_cloud') {
              // Para Meta: baixar audio via Media API antes de transcrever
              const { downloadMetaMedia } =
                await import('@/_lib/meta/download-meta-media')
              const metaInbox = await db.inbox.findFirst({
                where: { metaPhoneNumberId: message.instanceName },
                select: { metaAccessToken: true },
              })

              if (metaInbox?.metaAccessToken) {
                // media.url armazena o mediaId quando provider = meta_cloud (ver parse-meta-message.ts)
                const audioBuffer = await downloadMetaMedia(
                  message.media.url,
                  metaInbox.metaAccessToken,
                )
                const { transcribeAudioFromBuffer } =
                  await import('./utils/transcribe-audio')
                transcription = await transcribeAudioFromBuffer(
                  audioBuffer,
                  message.media.mimetype,
                )
              } else {
                log('step:3a audio_transcription', 'SKIP', {
                  reason: 'no_meta_access_token',
                })
                transcription =
                  '[Áudio não transcrito — token de acesso não disponível]'
              }
            } else if (message.provider === 'z_api') {
              // Z-API fornece URL publica — download direto
              const audioResponse = await fetch(message.media.url)
              const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())
              const { transcribeAudioFromBuffer } =
                await import('./utils/transcribe-audio')
              transcription = await transcribeAudioFromBuffer(
                audioBuffer,
                message.media.mimetype,
              )
            } else {
              // Para Evolution: buscar audio via getBase64FromMediaMessage
              transcription = await transcribeAudio(
                message.instanceName,
                message.messageId,
              )
            }

            messageText = transcription
            log('step:3a audio_transcribed', 'PASS', {
              length: transcription.length,
            })
            tracker.addStep({
              type: 'AUDIO_TRANSCRIPTION',
              status: 'PASSED',
              output: { length: transcription.length },
            })

            // Atualizar mensagem no DB com a transcrição real
            await db.message.updateMany({
              where: { providerMessageId: message.messageId },
              data: { content: transcription },
            })
          }

          // -----------------------------------------------------------------------
          // 2c. Download de mídia + contexto LLM para image/document
          // Para Meta Cloud: media.url contem o mediaId — download via Media API
          // -----------------------------------------------------------------------
          if (
            message.media &&
            (message.type === 'image' ||
              message.type === 'document' ||
              message.type === 'audio')
          ) {
            log('step:3b media_download', 'PASS', {
              type: message.type,
              mimetype: message.media.mimetype,
              provider: message.provider,
            })

            if (message.provider === 'meta_cloud') {
              // Para Meta: download via Media API usando o mediaId armazenado em media.url
              const metaInbox = await db.inbox.findFirst({
                where: { metaPhoneNumberId: message.instanceName },
                select: { metaAccessToken: true },
              })

              if (metaInbox?.metaAccessToken) {
                const { downloadAndStoreMetaMedia } =
                  await import('./utils/download-and-store-media')
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
                    ...ctx,
                    error:
                      error instanceof Error ? error.message : String(error),
                  })
                })
              }
            } else if (message.provider === 'z_api') {
              // Z-API fornece URL publica — download direto + store via Supabase
              const { downloadAndStoreFromUrl } =
                await import('./utils/download-and-store-media')
              await downloadAndStoreFromUrl({
                mediaUrl: message.media.url,
                providerMessageId: message.messageId,
                conversationId,
                organizationId,
                mimetype: message.media.mimetype,
                fileName: message.media.fileName,
              }).catch((error) => {
                logger.warn('Z-API media download failed (non-fatal)', {
                  ...ctx,
                  error: error instanceof Error ? error.message : String(error),
                })
              })
            } else {
              // Best-effort para Evolution: falha não bloqueia o fluxo
              await downloadAndStoreMedia({
                instanceName: message.instanceName,
                messageId: message.messageId,
                providerMessageId: message.messageId,
                conversationId,
                organizationId,
                mimetype: message.media.mimetype,
                fileName: message.media.fileName,
              }).catch((error) => {
                logger.warn('Media download failed (non-fatal)', {
                  ...ctx,
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
                // Para Meta: baixar imagem via Media API antes de transcrever
                // media.url armazena o mediaId (ver parse-meta-message.ts)
                const { downloadMetaMedia } =
                  await import('@/_lib/meta/download-meta-media')
                const metaInboxForImage = await db.inbox.findFirst({
                  where: { metaPhoneNumberId: message.instanceName },
                  select: { metaAccessToken: true },
                })

                if (!metaInboxForImage?.metaAccessToken) {
                  throw new Error(
                    'Meta access token not found for image transcription',
                  )
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
                // Z-API fornece URL publica — download direto
                const imageResponse = await fetch(message.media.url)
                const imageBuffer = Buffer.from(
                  await imageResponse.arrayBuffer(),
                )
                const imageBase64 = imageBuffer.toString('base64')

                description = await transcribeImage(
                  message.instanceName,
                  message.messageId,
                  message.text ?? undefined,
                  { base64: imageBase64, mimetype: message.media.mimetype },
                )
              } else {
                // Para Evolution: buscar imagem via getBase64FromMediaMessage
                description = await transcribeImage(
                  message.instanceName,
                  message.messageId,
                  message.text ?? undefined,
                )
              }

              const caption = message.text
                ? `\nLegenda do cliente: "${message.text}"`
                : ''
              messageText = `[Imagem enviada pelo cliente — descrição: ${description}${caption}]`
              log('step:3c image_transcribed', 'PASS', {
                length: description.length,
              })
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
              logger.warn('Image transcription failed, using placeholder', {
                ...ctx,
                error: error instanceof Error ? error.message : String(error),
              })
              const caption = message.text
                ? ` com legenda: "${message.text}"`
                : ''
              messageText = `[O cliente enviou uma imagem${caption}]`
              await db.message.updateMany({
                where: { providerMessageId: message.messageId },
                data: { content: messageText },
              })
              tracker.addStep({
                type: 'IMAGE_TRANSCRIPTION',
                status: 'PASSED',
                output: { fallback: true },
              })
            }
          } else if (message.type === 'image') {
            const caption = message.text
              ? ` com legenda: "${message.text}"`
              : ''
            messageText = `[O cliente enviou uma imagem${caption}]`
          } else if (message.type === 'document') {
            const fileName = message.media?.fileName ?? 'arquivo'
            messageText = `[O cliente enviou um documento: "${fileName}"]`
          }

          // -----------------------------------------------------------------------
          // 3. Context loading — prompt dinâmico + histórico + dados da conversa
          // -----------------------------------------------------------------------
          log('step:4 context_loading', 'PASS')

          // Montar contexto do grupo para injetar seção de transferência no prompt
          // Só relevante quando o agente faz parte de um grupo com múltiplos workers
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
              // Dentro de grupo, apenas member.isActive controla participação (agent.isActive é isolado)
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

          const [promptContext, messageHistory, conversation] =
            await Promise.all([
              buildSystemPrompt(effectiveAgentId, conversationId, organizationId, groupPromptContext),
              db.message.findMany({
                where: {
                  conversationId,
                  isArchived: false,
                },
                orderBy: { createdAt: 'asc' },
                take: MESSAGE_HISTORY_LIMIT,
                select: {
                  role: true,
                  content: true,
                },
              }),
              db.conversation.findUniqueOrThrow({
                where: { id: conversationId },
                select: {
                  contactId: true,
                  dealId: true,
                  // Dados do inbox para resolver provider em send_product_media
                  inbox: {
                    select: {
                      connectionType: true,
                      evolutionInstanceName: true,
                      evolutionApiUrl: true,
                      evolutionApiKey: true,
                      metaPhoneNumberId: true,
                      metaAccessToken: true,
                      zapiInstanceId: true,
                      zapiToken: true,
                      zapiClientToken: true,
                    },
                  },
                },
              }),
            ])

          log('step:4 context_loaded', 'PASS', {
            model: promptContext.modelId,
            historyCount: messageHistory.length,
            hasSummary: !!promptContext.summary,
            estimatedTokens: promptContext.estimatedTokens,
            contactName: promptContext.contactName,
          })
          tracker.addStep({
            type: 'CONTEXT_LOADING',
            status: 'PASSED',
            output: {
              model: promptContext.modelId,
              historyCount: messageHistory.length,
              hasSummary: !!promptContext.summary,
            },
          })

          updateActiveTrace({
            metadata: {
              agentId: effectiveAgentId,
              contactName: promptContext.contactName,
              model: promptContext.modelId,
              messageType: message.type,
            },
          })

          // -----------------------------------------------------------------------
          // 4a. Build LLM messages (prompt dinâmico + summary + history)
          // -----------------------------------------------------------------------
          const llmMessages: Array<{
            role: 'system' | 'user' | 'assistant'
            content: string
          }> = []

          llmMessages.push({
            role: 'system',
            content: promptContext.systemPrompt,
          })

          if (promptContext.summary) {
            llmMessages.push({
              role: 'system',
              content: `Resumo da conversa anterior:\n${promptContext.summary}`,
            })
          }

          for (const msg of messageHistory) {
            if (msg.role === 'user' || msg.role === 'assistant') {
              llmMessages.push({
                role: msg.role,
                content: msg.content,
              })
            }
          }

          // -----------------------------------------------------------------------
          // 4b. Optimistic credit debit (antes do LLM para evitar race condition)
          // Estima input tokens com o conteúdo REAL (system + summary + history)
          // -----------------------------------------------------------------------
          const MAX_OUTPUT_TOKENS = 3072
          const LLM_TEMPERATURE = 0.4
          const estimatedInputTokens = Math.ceil(
            llmMessages.reduce((sum, msg) => sum + msg.content.length, 0) / 4,
          )
          const estimatedCost = estimateMaxCost(
            promptContext.modelId,
            estimatedInputTokens,
            MAX_OUTPUT_TOKENS,
          )

          const optimisticDebited = await debitCredits(
            organizationId,
            estimatedCost,
            'Débito otimista — agente IA',
            {
              agentId: effectiveAgentId,
              conversationId,
              model: promptContext.modelId,
              estimatedInputTokens,
              estimatedCost,
              type: 'optimistic',
            },
          )

          if (!optimisticDebited) {
            log('step:4b optimistic_debit', 'EXIT', {
              reason: 'no_credits',
              estimatedCost,
              estimatedInputTokens,
            })
            await createConversationEvent({
              conversationId,
              type: 'PROCESSING_ERROR',
              content:
                'Créditos de IA insuficientes para processar esta mensagem.',
              metadata: { subtype: 'NO_CREDITS', estimatedCost },
            })

            // Notificar OWNER/ADMIN apenas se nao existe notificacao nao lida com mesmo titulo
            // nas ultimas 24h — evita spam por cada mensagem sem credito
            const recentCreditNotification = await db.notification.findFirst({
              where: {
                organizationId,
                type: 'SYSTEM',
                title: 'Créditos de IA esgotados',
                readAt: null,
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
              },
            })

            if (!recentCreditNotification) {
              const [orgAdmins, organization] = await Promise.all([
                db.member.findMany({
                  where: {
                    organizationId,
                    role: { in: ['OWNER', 'ADMIN'] },
                    status: 'ACCEPTED',
                    userId: { not: null },
                  },
                  select: { userId: true },
                }),
                db.organization.findUnique({
                  where: { id: organizationId },
                  select: { slug: true },
                }),
              ])

              if (orgAdmins.length > 0) {
                // Criar notificacoes diretamente (sem import server-only — ambiente Trigger.dev)
                for (const admin of orgAdmins) {
                  void db.notification.create({
                    data: {
                      organizationId,
                      userId: admin.userId!,
                      type: 'SYSTEM',
                      title: 'Créditos de IA esgotados',
                      body: 'Seus créditos de IA acabaram. Recarregue para continuar usando o agente.',
                      actionUrl: organization
                        ? `/org/${organization.slug}/settings/billing`
                        : null,
                      resourceType: 'credit',
                      resourceId: null,
                    },
                  })
                }
              }
            }

            tracker.addStep({
              type: 'CREDIT_CHECK',
              status: 'FAILED',
              output: { reason: 'no_credits', estimatedCost },
            })
            await revalidateConversationCache(conversationId, organizationId)
            updateActiveTrace({
              output: { outcome: 'no_credits' },
              tags: traceTags,
              metadata: { outcome: 'no_credits', estimatedCost },
            })
            await tracker.skip('no_credits')
            return { skipped: true, reason: 'no_credits' }
          }
          log('step:4b optimistic_debit', 'PASS', {
            estimatedCost,
            estimatedInputTokens,
          })
          tracker.addStep({
            type: 'CREDIT_CHECK',
            status: 'PASSED',
            output: { estimatedCost, estimatedInputTokens },
          })

          // -----------------------------------------------------------------------
          // 4c. Build tool set (filtrado pelo toolsEnabled do agent)
          // -----------------------------------------------------------------------
          const toolContext: ToolContext = {
            organizationId,
            agentId: effectiveAgentId,
            agentName: promptContext.agentName,
            conversationId,
            contactId: conversation.contactId,
            dealId: conversation.dealId,
            pipelineIds: promptContext.pipelineIds,
            remoteJid: message.remoteJid,
            inboxProvider: conversation.inbox ?? null,
          }

          const effectiveToolsEnabled = promptContext.toolsEnabled

          // Montar config do grupo para a tool transfer_to_agent
          const groupToolConfig: GroupToolConfig | undefined =
            groupPromptContext && groupPromptContext.workers.length > 1
              ? {
                  groupId: groupPromptContext.groupId,
                  workers: groupPromptContext.workers,
                }
              : undefined

          const tools = buildToolSet(
            effectiveToolsEnabled,
            toolContext,
            promptContext.allStepActions,
            {
              hasActiveProductsWithMedia: promptContext.hasActiveProductsWithMedia,
              hasKnowledgeBase: promptContext.hasKnowledgeBase,
            },
            groupToolConfig,
          )

          // -----------------------------------------------------------------------
          // 5. Typing presence — "digitando..." antes do LLM
          // Meta Cloud API nao suporta composing para business — apenas Evolution
          // -----------------------------------------------------------------------
          if (message.provider === 'evolution') {
            const presenceCredentials = await resolveEvolutionCredentialsByInstanceName(
              message.instanceName,
            )
            await sendPresence(
              message.instanceName,
              message.remoteJid,
              'composing',
              presenceCredentials,
            )
          }

          // -----------------------------------------------------------------------
          // 6. Call LLM (com logging de duração)
          // -----------------------------------------------------------------------
          log('step:5 llm_call', 'PASS', {
            model: promptContext.modelId,
            messageCount: llmMessages.length,
            toolCount: Object.keys(tools ?? {}).length,
          })

          const llmStartMs = Date.now()

          const result = await generateText({
            model: getModel(promptContext.modelId),
            messages: llmMessages,
            tools,
            temperature: LLM_TEMPERATURE,
            stopWhen: stepCountIs(4),
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            experimental_telemetry: {
              isEnabled: true,
              tracer: langfuseTracer,
              functionId: 'chat-completion',
              metadata: {
                agentId,
                conversationId,
                model: promptContext.modelId,
                contactName: promptContext.contactName,
              },
            },
          }).catch(async (llmError: unknown) => {
            // LLM falhou — devolver créditos do débito otimista
            // NÃO cria PROCESSING_ERROR aqui: o Trigger.dev pode fazer retry e o evento
            // ficaria "órfão" se o retry tiver sucesso. O evento é criado no onFailure
            // (só executa quando TODOS os retries falharam).
            log('step:5 llm_call', 'EXIT', {
              reason: 'llm_error',
              error:
                llmError instanceof Error ? llmError.message : String(llmError),
            })
            tracker.addStep({
              type: 'LLM_CALL',
              status: 'FAILED',
              output: {
                reason: 'llm_error',
                error:
                  llmError instanceof Error
                    ? llmError.message
                    : String(llmError),
              },
            })
            await refundCredits(
              organizationId,
              estimatedCost,
              'Refund — erro na chamada LLM',
              {
                agentId: effectiveAgentId,
                conversationId,
                model: promptContext.modelId,
                estimatedCost,
                reason: 'llm_error',
              },
            ).catch((refundError) => {
              logger.error('Failed to refund credits after LLM error', {
                ...ctx,
                refundError,
              })
            })
            throw llmError
          })

          const llmDurationMs = Date.now() - llmStartMs

          let responseText = result.text

          // Se o LLM gastou todos os steps em tool calls e não gerou texto,
          // faz uma chamada extra SEM tools para gerar a resposta ao cliente.
          if (!responseText) {
            const hasToolCalls = result.steps?.some(
              (step) => step.toolCalls && step.toolCalls.length > 0,
            )

            if (hasToolCalls) {
              traceTags.push('fallback')
              log('step:5b tool_only_fallback', 'PASS', {
                steps: result.steps?.length,
                toolCalls: result.steps?.flatMap(
                  (step) => step.toolCalls?.map((tc) => tc.toolName) ?? [],
                ),
              })

              // Construir mensagens com o histórico + resultados das tools para contexto
              const fallbackMessages = [
                ...llmMessages,
                // Incluir um resumo das ações realizadas pelas tools
                {
                  role: 'system' as const,
                  content:
                    'Você acabou de executar ações (tool calls) para o cliente, mas não gerou uma resposta textual. ' +
                    'Agora responda ao cliente de forma natural, informando o que foi feito. ' +
                    'Seja breve e objetivo.',
                },
              ]

              const fallbackResult = await generateText({
                model: getModel(promptContext.modelId),
                messages: fallbackMessages,
                temperature: LLM_TEMPERATURE,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                experimental_telemetry: {
                  isEnabled: true,
                  tracer: langfuseTracer,
                  functionId: 'chat-completion-fallback',
                  metadata: {
                    agentId,
                    conversationId,
                    reason: 'tool_only_fallback',
                  },
                },
              }).catch((fallbackError) => {
                logger.warn('Tool-only fallback LLM call failed', {
                  conversationId,
                  error:
                    fallbackError instanceof Error
                      ? fallbackError.message
                      : String(fallbackError),
                })
                return null
              })

              if (fallbackResult?.text) {
                responseText = fallbackResult.text
                log('step:5b tool_only_fallback', 'PASS', {
                  responseLength: responseText.length,
                })
                tracker.addStep({
                  type: 'FALLBACK_LLM_CALL',
                  status: 'PASSED',
                  output: { responseLength: responseText.length },
                })
              }
            }
          }

          if (!responseText) {
            // Genuinamente sem resposta (sem tool calls ou fallback falhou)
            const hadToolCalls = result.steps?.some(
              (step) => step.toolCalls && step.toolCalls.length > 0,
            ) ?? false
            const emptyTotalTokens =
              (result.usage?.inputTokens ?? 0) +
              (result.usage?.outputTokens ?? 0)
            const emptyActualCost = calculateCreditCost(
              promptContext.modelId,
              emptyTotalTokens,
            )
            const emptyRefund = estimatedCost - emptyActualCost
            if (emptyRefund > 0) {
              await refundCredits(
                organizationId,
                emptyRefund,
                'Refund — LLM empty response',
                {
                  agentId: effectiveAgentId,
                  conversationId,
                  model: promptContext.modelId,
                  estimatedCost,
                  actualCost: emptyActualCost,
                },
              )
            }
            await createConversationEvent({
              conversationId,
              type: 'INFO',
              content: 'A IA não gerou uma resposta para esta mensagem.',
              metadata: { subtype: 'EMPTY_RESPONSE' },
            })
            await revalidateConversationCache(conversationId, organizationId)
            traceTags.push('empty_response')
            triggerMetadata.set('outcome', 'empty_response')
            triggerMetadata.set('model', promptContext.modelId)
            updateActiveTrace({
              output: { outcome: 'empty_response' },
              tags: traceTags,
              metadata: {
                outcome: 'empty_response',
                finishReason: result.finishReason,
                creditsCost: emptyActualCost,
                resultTextLength: result.text?.length ?? 0,
              },
            })
            log('step:5 llm_call', 'EXIT', {
              reason: 'empty_response',
              llmDurationMs,
              actualCost: emptyActualCost,
              finishReason: result.finishReason,
              outputTokens: result.usage?.outputTokens ?? 0,
              stepsCount: result.steps?.length ?? 0,
              resultTextLength: result.text?.length ?? 0,
            })
            tracker.addStep({
              type: 'LLM_CALL',
              status: 'FAILED',
              durationMs: llmDurationMs,
              output: {
                reason: 'empty_response',
                resultText: result.text ?? null,
                resultTextLength: result.text?.length ?? 0,
                finishReason: result.finishReason,
                outputTokens: result.usage?.outputTokens ?? 0,
                inputTokens: result.usage?.inputTokens ?? 0,
                stepsCount: result.steps?.length ?? 0,
                toolCalls: result.steps?.flatMap(
                  (step) => step.toolCalls?.map((tc) => tc.toolName) ?? [],
                ) ?? [],
                fallbackAttempted: hadToolCalls,
              },
            })
            await tracker.skip({
              reason: 'empty_response',
              modelId: promptContext.modelId,
              inputTokens: result.usage?.inputTokens ?? 0,
              outputTokens: result.usage?.outputTokens ?? 0,
              creditsCost: emptyActualCost,
              finishReason: result.finishReason,
              metadata: {
                resultText: result.text ?? null,
                stepsCount: result.steps?.length ?? 0,
                fallbackAttempted: hadToolCalls,
              },
            })
            return { skipped: true, reason: 'empty_response' }
          }

          log('step:5 llm_response', 'PASS', {
            llmDurationMs,
            inputTokens: result.usage?.inputTokens,
            outputTokens: result.usage?.outputTokens,
            steps: result.steps?.length ?? 1,
            toolCalls:
              result.steps?.flatMap(
                (step) =>
                  step.toolCalls?.map((toolCall) => toolCall.toolName) ?? [],
              ) ?? [],
          })
          tracker.addStep({
            type: 'LLM_CALL',
            status: 'PASSED',
            durationMs: llmDurationMs,
            output: {
              inputTokens: result.usage?.inputTokens,
              outputTokens: result.usage?.outputTokens,
            },
          })

          // Registrar tool calls individuais como steps
          for (const aiStep of result.steps ?? []) {
            for (const toolCall of aiStep.toolCalls ?? []) {
              const toolResult = aiStep.toolResults?.find(
                (result) => result.toolName === toolCall.toolName,
              )
              const toolOutput = toolResult?.output as
                | { success?: boolean }
                | undefined
              const isToolSuccess = toolOutput?.success !== false
              tracker.addStep({
                type: 'TOOL_CALL',
                status: isToolSuccess ? 'PASSED' : 'FAILED',
                toolName: toolCall.toolName,
                input: toolCall.input as Record<string, unknown>,
                output: toolResult?.output as
                  | Record<string, unknown>
                  | undefined,
              })
            }
          }

          // Create tool events from LLM steps
          if (result.steps?.length) {
            await createToolEvents(conversationId, result.steps)
            const usedToolNames = result.steps.flatMap(
              (step) => step.toolCalls?.map((tc) => tc.toolName) ?? [],
            )
            if (usedToolNames.length > 0) {
              traceTags.push('tool_calls')
            }
          }

          // -----------------------------------------------------------------------
          // 7. Double-check anti-atropelamento — re-query aiPaused
          //    Pula se o próprio agente disparou hand_off_to_human nesta execução,
          //    caso contrário a resposta final nunca seria enviada ao lead.
          // -----------------------------------------------------------------------
          const agentTriggeredHandOff = result.steps?.some((aiStep) =>
            aiStep.toolCalls?.some(
              (toolCall) => toolCall.toolName === 'hand_off_to_human',
            ),
          )

          const freshConversation = agentTriggeredHandOff
            ? null
            : await db.conversation.findUnique({
                where: { id: conversationId },
                select: { aiPaused: true },
              })

          if (freshConversation?.aiPaused) {
            // Salva resposta no banco mas NÃO envia no WhatsApp
            await db.message.create({
              data: {
                conversationId,
                role: 'assistant',
                content: responseText,
                inputTokens: result.usage?.inputTokens ?? null,
                outputTokens: result.usage?.outputTokens ?? null,
                metadata: {
                  model: promptContext.modelId,
                  skippedReason: 'ai_paused_during_generation',
                  llmDurationMs,
                },
              },
            })

            // Ajustar créditos: cobrar custo real, refundar a diferença
            const pausedTotalTokens =
              (result.usage?.inputTokens ?? 0) +
              (result.usage?.outputTokens ?? 0)
            const pausedActualCost = calculateCreditCost(
              promptContext.modelId,
              pausedTotalTokens,
            )
            const pausedRefund = estimatedCost - pausedActualCost
            if (pausedRefund > 0) {
              await refundCredits(
                organizationId,
                pausedRefund,
                'Refund — IA pausada durante geração',
                {
                  agentId: effectiveAgentId,
                  conversationId,
                  model: promptContext.modelId,
                  estimatedCost,
                  actualCost: pausedActualCost,
                },
              )
            }

            await createConversationEvent({
              conversationId,
              type: 'INFO',
              content:
                'IA foi pausada durante geração. Resposta salva mas não enviada.',
              metadata: { subtype: 'AI_PAUSED_DURING_GENERATION' },
            })
            await revalidateConversationCache(conversationId, organizationId)
            log('step:6 pause_recheck', 'EXIT', {
              reason: 'ai_paused_during_generation',
              llmDurationMs,
            })
            tracker.addStep({
              type: 'PAUSE_CHECK',
              status: 'SKIPPED',
              output: { reason: 'ai_paused_during_generation' },
            })
            updateActiveTrace({
              output: { outcome: 'ai_paused_during_generation' },
              tags: traceTags,
              metadata: {
                outcome: 'ai_paused_during_generation',
                creditsCost: pausedActualCost,
              },
            })
            await tracker.skip({
              reason: 'ai_paused_during_generation',
              modelId: promptContext.modelId,
              inputTokens: result.usage?.inputTokens ?? 0,
              outputTokens: result.usage?.outputTokens ?? 0,
              creditsCost: pausedActualCost,
              finishReason: result.finishReason,
            })
            return { skipped: true, reason: 'ai_paused_during_generation' }
          }
          log('step:6 pause_recheck', 'PASS')
          tracker.addStep({ type: 'PAUSE_CHECK', status: 'PASSED' })

          // -----------------------------------------------------------------------
          // 8. Salvar resposta no banco + atualizar lastMessageRole na conversa
          // -----------------------------------------------------------------------
          await db.message.create({
            data: {
              conversationId,
              role: 'assistant',
              content: responseText,
              inputTokens: result.usage?.inputTokens ?? null,
              outputTokens: result.usage?.outputTokens ?? null,
              metadata: {
                model: promptContext.modelId,
                llmDurationMs,
              },
            },
          })

          // Denormalizar role da última mensagem para viabilizar filtro "não respondidos"
          await db.conversation.update({
            where: { id: conversationId },
            data: { lastMessageRole: 'assistant', ...AUTO_REOPEN_FIELDS },
          })

          log('step:7 response_saved', 'PASS')

          await revalidateConversationCache(conversationId, organizationId)

          // -----------------------------------------------------------------------
          // 9. Ajuste de créditos (refund se custo real < estimado, debit extra se >)
          // -----------------------------------------------------------------------
          const totalTokens =
            (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0)
          const actualCost = calculateCreditCost(
            promptContext.modelId,
            totalTokens,
          )
          const creditDiff = estimatedCost - actualCost

          if (creditDiff > 0) {
            await refundCredits(
              organizationId,
              creditDiff,
              'Ajuste pós-LLM — custo real menor que estimado',
              {
                agentId: effectiveAgentId,
                conversationId,
                model: promptContext.modelId,
                estimatedCost,
                actualCost,
                totalTokens,
              },
            )
            log('step:8 credit_adjustment', 'PASS', {
              type: 'refund',
              creditDiff,
              estimatedCost,
              actualCost,
              totalTokens,
            })
          } else if (creditDiff < 0) {
            // Custo real maior que estimado (raro) — debitar diferença
            const extraDebited = await debitCredits(
              organizationId,
              -creditDiff,
              'Ajuste pós-LLM — custo real maior que estimado',
              {
                agentId: effectiveAgentId,
                conversationId,
                model: promptContext.modelId,
                estimatedCost,
                actualCost,
                totalTokens,
                type: 'adjustment',
              },
              false, // não incrementar totalMessagesUsed
            )
            log('step:8 credit_adjustment', extraDebited ? 'PASS' : 'SKIP', {
              type: 'extra_debit',
              creditDiff: -creditDiff,
              estimatedCost,
              actualCost,
              totalTokens,
            })
          } else {
            log('step:8 credit_adjustment', 'PASS', {
              type: 'exact',
              estimatedCost,
              actualCost,
              totalTokens,
            })
          }

          // -----------------------------------------------------------------------
          // 10. Send WhatsApp message + pre-register dedup keys
          // Roteamento pelo provider: Evolution ou Meta Cloud
          // -----------------------------------------------------------------------
          let sentMessageIds: string[]

          if (message.provider === 'meta_cloud') {
            // Para Meta Cloud: buscar metaAccessToken do inbox (nunca vem no payload por seguranca)
            const metaInbox = await db.inbox.findFirst({
              where: { metaPhoneNumberId: message.instanceName },
              select: { metaAccessToken: true },
            })

            if (!metaInbox?.metaAccessToken) {
              throw new Error(
                `Meta access token not found for phoneNumberId: ${message.instanceName}`,
              )
            }

            sentMessageIds = await sendMetaTextMessage(
              message.instanceName,
              metaInbox.metaAccessToken,
              message.remoteJid.replace('@s.whatsapp.net', ''),
              responseText,
            )
          } else if (message.provider === 'z_api') {
            // Para Z-API: buscar credenciais do inbox (per-inbox, nunca no payload)
            const zapiInbox = await db.inbox.findFirst({
              where: { zapiInstanceId: message.instanceName },
              select: {
                zapiInstanceId: true,
                zapiToken: true,
                zapiClientToken: true,
              },
            })

            if (
              !zapiInbox?.zapiToken ||
              !zapiInbox?.zapiClientToken ||
              !zapiInbox?.zapiInstanceId
            ) {
              throw new Error(
                `Z-API credentials not found for instanceId: ${message.instanceName}`,
              )
            }

            const { sendZApiTextMessage } =
              await import('@/_lib/zapi/send-message')
            sentMessageIds = await sendZApiTextMessage(
              {
                instanceId: zapiInbox.zapiInstanceId,
                token: zapiInbox.zapiToken,
                clientToken: zapiInbox.zapiClientToken,
              },
              message.remoteJid.replace('@s.whatsapp.net', ''),
              responseText,
            )
          } else {
            // Provider Evolution (default)
            const evolutionCredentials = await resolveEvolutionCredentialsByInstanceName(
              message.instanceName,
            )
            sentMessageIds = await sendWhatsAppMessage(
              message.instanceName,
              message.remoteJid,
              responseText,
              evolutionCredentials,
            )
          }

          // Pré-registrar dedup keys para que o webhook fromMe ignore estas mensagens
          // (evita duplicata no banco + auto-pause da IA)
          await Promise.all(
            sentMessageIds.map((sentId) =>
              redis.set(`dedup:${sentId}`, '1', 'EX', 300).catch(() => {}),
            ),
          )

          log('step:9 whatsapp_sent', 'PASS', {
            responseLength: responseText.length,
            sentMessageIds,
            provider: message.provider,
          })
          tracker.addStep({
            type: 'SEND_MESSAGE',
            status: 'PASSED',
            output: {
              responseLength: responseText.length,
              provider: message.provider,
            },
          })

          // -----------------------------------------------------------------------
          // 10b. Schedule follow-up (se agente tem regras de FUP para o step atual)
          // Non-fatal: falha no agendamento nao bloqueia o fluxo principal
          // -----------------------------------------------------------------------
          try {
            const conversationForFup = await db.conversation.findUnique({
              where: { id: conversationId },
              select: { currentStepOrder: true },
            })

            if (!conversationForFup) {
              logger.warn(
                '[step:10b] Conversation not found for FUP scheduling',
                { conversationId },
              )
            } else {
              const followUps = await getFollowUpsForStep(
                effectiveAgentId,
                conversationForFup.currentStepOrder,
              )

              if (followUps.length > 0) {
                const firstFollowUp = followUps[0] // order 0 — o primeiro da sequência
                const nextFollowUpAt = new Date(
                  Date.now() + firstFollowUp.delayMinutes * 60 * 1000,
                )

                await db.conversation.update({
                  where: { id: conversationId },
                  data: {
                    nextFollowUpAt,
                    followUpCount: 0,
                  },
                })

                log('step:10b follow_up_scheduled', 'PASS', {
                  totalFollowUps: followUps.length,
                  firstDelayMinutes: firstFollowUp.delayMinutes,
                  nextFollowUpAt: nextFollowUpAt.toISOString(),
                })
                tracker.addStep({
                  type: 'FOLLOW_UP_SCHEDULE',
                  status: 'PASSED',
                  output: {
                    totalFollowUps: followUps.length,
                    firstDelayMinutes: firstFollowUp.delayMinutes,
                  },
                })
              } else {
                // Nenhum follow-up cobre este step — limpar qualquer FUP pendente
                await db.conversation.update({
                  where: { id: conversationId },
                  data: { nextFollowUpAt: null, followUpCount: 0 },
                })
                log('step:10b follow_up_scheduled', 'SKIP', {
                  reason: 'no_follow_ups_for_step',
                })
                tracker.addStep({
                  type: 'FOLLOW_UP_SCHEDULE',
                  status: 'SKIPPED',
                  output: { reason: 'no_follow_ups_for_step' },
                })
              }
            }
          } catch (fupError) {
            logger.error('Follow-up scheduling failed', {
              conversationId,
              error:
                fupError instanceof Error ? fupError.message : String(fupError),
            })
            // Limpar estado para evitar estado órfão que ficaria disparando o cron indefinidamente
            await db.conversation
              .update({
                where: { id: conversationId },
                data: { nextFollowUpAt: null, followUpCount: 0 },
              })
              .catch(() => {})
          }

          // -----------------------------------------------------------------------
          // 11. Memory compression — se >= threshold msgs, summarizar e arquivar
          // -----------------------------------------------------------------------
          const memoryCompressed = await compressMemory(conversationId)
          tracker.addStep({
            type: 'MEMORY_COMPRESSION',
            status: memoryCompressed ? 'PASSED' : 'SKIPPED',
            output: memoryCompressed ? { compressed: true } : { reason: 'below_threshold' },
          })

          // -----------------------------------------------------------------------
          // 12. Logging final
          // -----------------------------------------------------------------------
          const totalDurationMs = Date.now() - taskStartMs

          triggerMetadata.set('outcome', 'completed')
          triggerMetadata.set('model', promptContext.modelId)
          updateActiveTrace({
            output: { outcome: 'completed', responseLength: responseText.length },
            tags: traceTags,
            metadata: {
              outcome: 'completed',
              finishReason: result.finishReason,
              creditsCost: actualCost,
              totalDurationMs,
              inputTokens: result.usage?.inputTokens,
              outputTokens: result.usage?.outputTokens,
            },
          })

          log('step:10 completed', 'PASS', {
            inputTokens: result.usage?.inputTokens,
            outputTokens: result.usage?.outputTokens,
            llmDurationMs,
            totalDurationMs,
          })

          // Persistir execução completa em batch — falha non-fatal (try/catch interno)
          await tracker.complete({
            modelId: promptContext.modelId,
            inputTokens: result.usage?.inputTokens ?? 0,
            outputTokens: result.usage?.outputTokens ?? 0,
            creditsCost: actualCost,
            finishReason: result.finishReason,
          })

          return { success: true }
        } finally {
          await flushLangfuse()
        }
      },
      { name: 'process-agent-message' },
    )() // observe
  },
})

// ---------------------------------------------------------------------------
// onFailure — só executa quando TODOS os retries falharam
// Cria o PROCESSING_ERROR event aqui para evitar eventos órfãos em retries bem-sucedidos
// ---------------------------------------------------------------------------

tasks.onFailure(async ({ payload, error }) => {
  const {
    conversationId,
    organizationId,
    agentId,
    message,
  } = payload as ProcessAgentMessagePayload
  logger.error('process-agent-message failed after all retries', {
    conversationId,
    error: error instanceof Error ? error.message : String(error),
  })

  // Criar execution FAILED standalone — sem steps (tracker em memória se perdeu nos retries)
  // agentId pode ser '' no modo de grupo com requiresRouting=true — usar null nesses casos
  const failureAgentId = agentId || null
  const failureGroupId = (payload as ProcessAgentMessagePayload).groupId ?? null

  try {
    await db.agentExecution.create({
      data: {
        id: crypto.randomUUID(),
        agentId: failureAgentId,
        agentGroupId: failureGroupId,
        organizationId,
        conversationId,
        triggerMessageId: message.messageId,
        status: 'FAILED',
        startedAt: new Date(),
        completedAt: new Date(),
        errorMessage:
          error instanceof Error ? error.message : String(error),
      },
    })
  } catch (persistError) {
    logger.warn('Failed to persist failed execution', { persistError })
  }

  await createConversationEvent({
    conversationId,
    type: 'PROCESSING_ERROR',
    content: 'Erro ao processar mensagem com IA.',
    metadata: {
      subtype: 'LLM_ERROR',
      error: error instanceof Error ? error.message : String(error),
    },
  })
  await revalidateConversationCache(conversationId, organizationId)
})

// ---------------------------------------------------------------------------
// Memory Compression
// ---------------------------------------------------------------------------

// Retorna true se a compressão foi executada, false se ficou abaixo do threshold
async function compressMemory(conversationId: string): Promise<boolean> {
  try {
    const totalMessages = await db.message.count({
      where: { conversationId, isArchived: false },
    })

    if (totalMessages < SUMMARIZATION_THRESHOLD) return false

    // Buscar todas as mensagens ativas ordenadas por data
    const allMessages = await db.message.findMany({
      where: { conversationId, isArchived: false },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
      },
    })

    // Separar: arquivar tudo exceto as últimas N
    const toArchiveCount = allMessages.length - KEEP_RECENT_MESSAGES
    if (toArchiveCount <= 0) return false

    const messagesToArchive = allMessages.slice(0, toArchiveCount)

    // Montar transcript para sumarização
    const transcript = messagesToArchive
      .map((msg) => `[${msg.role}]: ${msg.content}`)
      .join('\n')

    // Gerar resumo via LLM
    const summaryResult = await generateText({
      model: getModel(SUMMARIZATION_MODEL),
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente especializado em gerar resumos densos de conversas. ' +
            'Resuma a conversa abaixo mantendo: pontos-chave discutidos, decisões tomadas, ' +
            'informações do cliente mencionadas e próximos passos combinados. ' +
            'Seja conciso mas não perca informações importantes. Responda em português.',
        },
        {
          role: 'user',
          content: `Resuma esta conversa:\n\n${transcript}`,
        },
      ],
      maxOutputTokens: 512,
      experimental_telemetry: {
        isEnabled: true,
        tracer: langfuseTracer,
        functionId: 'memory-compression',
        metadata: { conversationId, model: SUMMARIZATION_MODEL },
      },
    })

    const summary = summaryResult.text

    if (!summary) {
      logger.warn('Summarization returned empty result', { conversationId })
      return false
    }

    // Transaction: salvar summary + arquivar mensagens antigas
    const archiveIds = messagesToArchive.map((msg) => msg.id)

    await db.$transaction([
      db.conversation.update({
        where: { id: conversationId },
        data: { summary },
      }),
      db.message.updateMany({
        where: { id: { in: archiveIds } },
        data: { isArchived: true },
      }),
    ])

    logger.info('Memory compressed', {
      conversationId,
      archivedCount: archiveIds.length,
      summaryLength: summary.length,
    })
    return true
  } catch (error) {
    // Non-fatal: falha na compressão não bloqueia o fluxo
    logger.warn('Memory compression failed', { conversationId, error })
    return false
  }
}

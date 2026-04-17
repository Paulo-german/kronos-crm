import { task, tasks, logger, metadata as triggerMetadata } from '@trigger.dev/sdk/v3'
import { generateText, stepCountIs, Output } from 'ai'
import { z } from 'zod'
import { observe, updateActiveTrace } from '@langfuse/tracing'
import { getModel } from '@/_lib/ai/provider'
import { SUMMARIZATION_MODEL_ID } from '@/_lib/ai/models'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { debitCredits, refundCredits } from '@/_lib/billing/credit-utils'
import {
  estimateMaxCost,
  calculateCreditCost,
} from '@/_lib/ai/pricing'
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
import type {
  InfoSubtype,
  ProcessingErrorSubtype,
} from '@/_lib/conversation-events/types'
import { transcribeAudio } from './utils/transcribe-audio'
import { AUTO_REOPEN_FIELDS } from '@/_lib/conversation/auto-reopen'
import { prefixAttendantName } from '@/_lib/inbox/prefix-attendant-name'
import { transcribeImage } from './utils/transcribe-image'
import { downloadAndStoreMedia } from './utils/download-and-store-media'
import { getFollowUpsForStep } from '@/_data-access/follow-up/get-follow-ups-for-step'
import { createExecutionTracker } from './lib/execution-tracker'
import { revalidateConversationCache } from './lib/revalidate-cache'
import type { ToolContext } from './tools/types'
import type { NormalizedWhatsAppMessage } from '@/_lib/evolution/types'
// --- Imports exclusivos do pipeline v2 (multi-agente) ---
import { toolAgent } from './agent/tool-agent'
import { responseAgent } from './agent/response-agent'
import { leakGuardrail } from './agent/leak-guardrail'
import { buildPromptBaseContext } from './lib/prompt-base-context'
import { GENERIC_SAFE_FALLBACK } from './lib/two-phase-types'
import type { TriggerHumanHandoffCtx, ModelMessage, ResponseAgentResult, LeakGuardrailResult } from './lib/two-phase-types'
import { sendTypingPresence } from './lib/send-typing-presence'
import { triggerHumanHandoff } from './lib/trigger-human-handoff'
import {
  checkAntiAtropelamento,
  saveAssistantMessage,
  sendWhatsappMessage as sendWhatsappMessageV2,
  dedupOutbound,
  adjustCredits,
  scheduleFollowUp,
  createToolEvents as createToolEventsV2,
} from './lib/post-llm'
import { parseMessageBlocks } from './lib/parse-message-blocks'
import { sendMediaUtility } from './lib/send-media-utility'

const MESSAGE_HISTORY_LIMIT = 50
const SUMMARIZATION_THRESHOLD = 12
const KEEP_RECENT_MESSAGES = 3

// Tool names que o LLM pode vazar como texto JSON em vez de usar tool calling estruturado
const KNOWN_TOOL_NAMES = new Set([
  'move_deal',
  'update_contact',
  'update_deal',
  'create_task',
  'search_knowledge',
  'list_availability',
  'create_event',
  'update_event',
  'hand_off_to_human',
  'search_products',
  'send_product_media',
  'send_media',
  'transfer_to_agent',
])

// Schema para structured output quando o agente tem steps configurados.
// Separar message de currentStep evita que o LLM "vaze" JSON como texto ao cliente.
const agentOutputSchema = z.object({
  message: z.string().describe(
    'Sua resposta ao cliente. Texto natural que será enviado diretamente ao lead.',
  ),
  currentStep: z.number().int().min(0).describe(
    'Número (0-indexed) da etapa do processo de atendimento em que a conversa se encontra após esta interação. Só avança, nunca retrocede.',
  ),
})

// Custo em steps LLM de gerar structured output — o SDK usa um step extra para o output
const STEP_OUTPUT_OVERHEAD = 1

/**
 * Strip JSON tool calls que o LLM vazou como texto puro.
 * Alguns modelos (ex: Gemini) geram `{"tool":"update_deal","title":"..."}` inline
 * em vez de usar o mecanismo de tool calling do SDK.
 */
function stripLeakedToolCalls(text: string): string {
  // Padrão 1: JSON com chave "tool"/"function"/"action"/"name" nomeando tool conhecida
  let cleaned = text.replace(
    /\{[^{}]*"(?:tool|function|action)"\s*:\s*"([a-z_]+)"[^{}]*\}/g,
    (match, toolName: string) => {
      if (KNOWN_TOOL_NAMES.has(toolName)) {
        return ''
      }
      return match
    },
  )

  // Padrão 2: blocos markdown (```) contendo JSON de tool call
  cleaned = cleaned.replace(
    /```(?:json)?\s*\n?\{[^`]*"(?:tool|function|action)"\s*:\s*"([a-z_]+)"[^`]*\}[\s\n]*```/g,
    (match, toolName: string) => {
      if (KNOWN_TOOL_NAMES.has(toolName)) {
        return ''
      }
      return match
    },
  )

  return cleaned
}

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
  errorMessage?: string // Mensagem humana rica; se omitida, usa reason como fallback
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

export const processAgentMessage = task({
  id: 'process-agent-message',
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: ProcessAgentMessagePayload, { ctx: triggerCtx }) => {
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

        const attemptNumber = triggerCtx.attempt.number

        // Helper de log — sempre inclui msgId + conversationId + attempt para rastreio
        const ctx = { msgId: message.messageId, conversationId, agentId, attempt: attemptNumber }
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
        triggerMetadata.set('attemptNumber', attemptNumber)

        // effectiveAgentId começa como o agentId do payload.
        // No modo de grupo com requiresRouting = true, é sobrescrito pelo worker resolvido.
        // O tracker do worker é criado APÓS o routing para usar o ID correto.
        let effectiveAgentId = agentId

        // Tags acumulativas para o trace Langfuse (updateActiveTrace faz replace, não merge)
        // Simulator usa tag distinta para separar traces de testes de produção real
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

        // Helper: garante que todo caminho de saída fecha o trace com output + tags + metadata
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
              finalizeTrace('skipped:debounce')
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
                errorMessage, // Grava mensagem humana no AgentExecution.errorMessage
              })

              // Registrar evento na timeline da conversa apenas quando não for falta de
              // créditos — essa situação já tem seu próprio fluxo de notificação.
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
                // Revalidar cache do inbox para que o evento apareça imediatamente na timeline
                // (padrão canônico — mesmo comportamento do NO_CREDITS na linha 928).
                await revalidateConversationCache(conversationId, organizationId)
              }

              finalizeTrace('skipped:router_failed', { metadata: { error: errorMessage } })
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
              finalizeTrace('skipped:no_suitable_worker')
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
                finalizeTrace('skipped:outside_business_hours', { metadata: { workerId: effectiveAgentId } })
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
              // Usa credenciais per-inbox (self-hosted) ou globais como fallback
              try {
                const evolutionCredentials = await resolveEvolutionCredentialsByInstanceName(message.instanceName)
                transcription = await transcribeAudio(
                  message.instanceName,
                  message.messageId,
                  evolutionCredentials,
                )
              } catch (error) {
                logger.warn('Evolution audio transcription failed, using fallback', {
                  instanceName: message.instanceName,
                  messageId: message.messageId,
                  error: error instanceof Error ? error.message : String(error),
                })
                transcription = '[Áudio não transcrito — erro ao buscar mídia]'
              }
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
              // Usa credenciais per-inbox (self-hosted) ou globais como fallback
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

          // -----------------------------------------------------------------------
          // 3a. Bifurcação v1/v2 — lê agentVersion com query isolada (1 campo, ~1ms).
          // Precisa ficar ANTES de buildSystemPrompt e buildPromptBaseContext para
          // evitar trabalho pesado desnecessário no branch errado.
          // -----------------------------------------------------------------------
          const { agentVersion } = await db.agent.findUniqueOrThrow({
            where: { id: effectiveAgentId },
            select: { agentVersion: true },
          })

          if (agentVersion === 'v2') {
            // ===================================================================
            // PIPELINE V2 — Multi-agente (Tool Agent → Response Agent → Leak Guardrail)
            // buildSystemPrompt NÃO é chamado aqui. Fluxo retorna antes de alcançar o v1.
            // ===================================================================

            const phaseTraceId = crypto.randomUUID()

            // Langfuse distributed tracing: criamos o trace raiz via observe() que já
            // encapsula toda a execução. Para extrair traceId/spanId OTEL e passá-los
            // explicitamente aos subtasks (que rodam em workers separados, sem propagação
            // automática de contexto), usamos @opentelemetry/api.
            // TODO: importar { context, trace } from '@opentelemetry/api' quando disponível
            // no ambiente Trigger.dev. Por ora, usamos strings sentinela que os subtasks
            // aceitam via schema (langfuseTraceId: z.string().length(32)).
            // O distributed tracing via startObservation nos subtasks funciona independentemente.
            const langfuseTraceId = phaseTraceId.replace(/-/g, '').padEnd(32, '0').slice(0, 32)
            const langfuseSpanId = phaseTraceId.replace(/-/g, '').slice(0, 16)

            const baseLogContext = {
              conversationId,
              organizationId,
              phaseTraceId,
              langfuseTraceId,
              agentId: effectiveAgentId,
            }

            logger.info('v2 pipeline started', {
              ...baseLogContext,
              pipeline: 'v2',
              messageType: message.type,
            })

            // groupPromptContext já foi montado acima — convertemeos para GroupContext
            // (null quando o agente não pertence a nenhum grupo)
            const groupCtxForV2 = groupPromptContext
              ? {
                  groupId: groupPromptContext.groupId,
                  currentAgentId: groupPromptContext.currentAgentId,
                  workers: groupPromptContext.workers,
                }
              : null

            // Monta PromptBaseContext 1x — snapshot determinístico reusado pelos 3 subtasks.
            // Retry de qualquer subtask re-usa exatamente o mesmo contexto (§1.9.1 do plano).
            const promptBaseContext = await buildPromptBaseContext(
              effectiveAgentId,
              conversationId,
              organizationId,
              groupCtxForV2,
            )

            // === Message History v2 — últimas 12 mensagens (sem compressMemory) ===
            // V2 simplifica: 12 mais recentes (desc) + reverse para cronológico.
            // V1 usa até 50 + sumarização via LLM. V2 não precisa do overhead.
            const MESSAGE_HISTORY_LIMIT_V2 = 12
            const rawMessageHistory = await db.message.findMany({
              where: { conversationId },
              orderBy: { createdAt: 'desc' },
              take: MESSAGE_HISTORY_LIMIT_V2,
              select: { role: true, content: true, metadata: true },
            })
            rawMessageHistory.reverse() // ordem cronológica (mais antiga primeiro)

            // Enrichment de metadata — mesmo padrão v1 (mediaTranscription inline).
            // Converte { role, content, metadata } → { role, content } com mídia expandida.
            const llmMessages: ModelMessage[] = []
            for (const msg of rawMessageHistory) {
              if (msg.role === 'user' || msg.role === 'assistant') {
                let content = msg.content
                if (msg.role === 'assistant' && msg.metadata) {
                  const meta = msg.metadata as Record<string, unknown>
                  if (typeof meta.mediaTranscription === 'string' && meta.mediaTranscription.length > 0) {
                    content = `[Mídia enviada pelo atendente — conteúdo: ${meta.mediaTranscription}]`
                  }
                }
                llmMessages.push({ role: msg.role, content })
              }
            }

            // Dados da conversa necessários para o v2 (contactId, dealId, inbox)
            // — query separada pois o Promise.all v1 ainda não foi executado aqui.
            const conversationV2 = await db.conversation.findUniqueOrThrow({
              where: { id: conversationId },
              select: {
                contactId: true,
                dealId: true,
                remoteJid: true,
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
                    showAttendantName: true,
                  },
                },
              },
            })

            // ToolContext montado 1x — reusado pelos subtasks Agent 1 e Agent 2.
            const toolContextV2: ToolContext = {
              organizationId,
              agentId: effectiveAgentId,
              agentName: promptBaseContext.agentName,
              conversationId,
              contactId: conversationV2.contactId,
              dealId: conversationV2.dealId,
              pipelineIds: promptBaseContext.pipelineIds,
              remoteJid: conversationV2.remoteJid ?? message.remoteJid,
              inboxProvider: conversationV2.inbox ?? null,
            }

            // Typing presence antes do Agent 1 — cliente vê "digitando..." imediatamente.
            // O helper trata internamente erros e diferenças de provider.
            await sendTypingPresence({
              provider: message.provider,
              instanceName: message.instanceName,
              remoteJid: message.remoteJid,
              conversationId,
              organizationId,
            })

            // === PRÉ-LLM — estimativa de custo e débito otimista ===
            const MAX_OUTPUT_TOKENS_V2 = 3072
            const MULTI_AGENT_COST_MULTIPLIER = 2.2

            // Estimativa grosseira (chars / 4) — mesma heurística do v1
            const estimatedInputTokensV2 = Math.ceil(
              llmMessages.reduce((sum, msg) => sum + msg.content.length, 0) / 4,
            )

            // O multiplier 2.2 cobre os 3 subtasks (§4.9 do plano)
            const estimatedCostV2 =
              estimateMaxCost(promptBaseContext.modelId, estimatedInputTokensV2, MAX_OUTPUT_TOKENS_V2) *
              MULTI_AGENT_COST_MULTIPLIER

            const optimisticDebitedV2 = await debitCredits(
              organizationId,
              estimatedCostV2,
              'Débito otimista — agente IA (v2 multi-agente)',
              {
                agentId: effectiveAgentId,
                conversationId,
                model: promptBaseContext.modelId,
                estimatedInputTokens: estimatedInputTokensV2,
                estimatedCost: estimatedCostV2,
                type: 'optimistic',
                pipeline: 'v2',
              },
            )

            if (!optimisticDebitedV2) {
              logger.warn('v2 pipeline: no credits', baseLogContext)
              await createConversationEvent({
                conversationId,
                type: 'PROCESSING_ERROR',
                content: 'Créditos de IA insuficientes para processar esta mensagem.',
                metadata: {
                  subtype: 'NO_CREDITS' satisfies ProcessingErrorSubtype,
                  estimatedCost: estimatedCostV2,
                },
              })

              // Notificar OWNER/ADMIN apenas se não existe notificação não lida nas últimas 24h
              const recentV2CreditNotification = await db.notification.findFirst({
                where: {
                  organizationId,
                  type: 'SYSTEM',
                  title: 'Créditos de IA esgotados',
                  readAt: null,
                  createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
              })

              if (!recentV2CreditNotification) {
                const [orgAdminsV2, orgV2] = await Promise.all([
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

                if (orgAdminsV2.length > 0) {
                  for (const admin of orgAdminsV2) {
                    void db.notification.create({
                      data: {
                        organizationId,
                        userId: admin.userId!,
                        type: 'SYSTEM',
                        title: 'Créditos de IA esgotados',
                        body: 'Seus créditos de IA acabaram. Recarregue para continuar usando o agente.',
                        actionUrl: orgV2 ? `/org/${orgV2.slug}/settings/billing` : null,
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
                output: { reason: 'no_credits', estimatedCost: estimatedCostV2, pipeline: 'v2' },
              })
              await revalidateConversationCache(conversationId, organizationId)
              finalizeTrace('no_credits', { metadata: { estimatedCost: estimatedCostV2, pipeline: 'v2' } })
              await tracker.skip('no_credits')
              return { skipped: true, reason: 'no_credits' }
            }

            tracker.addStep({
              type: 'CREDIT_CHECK',
              status: 'PASSED',
              output: { estimatedCost: estimatedCostV2, estimatedInputTokens: estimatedInputTokensV2, pipeline: 'v2' },
            })

            const llmStartMsV2 = Date.now()

            // ===================================================================
            // AGENT 1 — Tool Agent
            // Executa tools de CRM/agenda/pesquisa e infere step do funil.
            // ===================================================================
            const toolResult = await toolAgent.triggerAndWait({
              modelId: promptBaseContext.modelId,
              promptBaseContext,
              toolContext: toolContextV2,
              llmMessages,
              conversationId,
              organizationId,
              agentId: effectiveAgentId,
              phaseTraceId,
              langfuseTraceId,
              langfuseParentSpanId: langfuseSpanId,
            })

            if (!toolResult.ok) {
              // Refund completo — subtask falhou após todos os retries internos
              await refundCredits(
                organizationId,
                estimatedCostV2,
                'Refund — Tool Agent falhou após todos os retries',
                {
                  agentId: effectiveAgentId,
                  conversationId,
                  phaseTraceId,
                  pipeline: 'v2',
                },
              ).catch((refundErr) => {
                logger.error('v2 pipeline: failed to refund after toolAgent failure', {
                  ...baseLogContext,
                  error: refundErr instanceof Error ? refundErr.message : String(refundErr),
                })
              })
              throw toolResult.error ?? new Error('tool-agent subtask failed')
            }

            tracker.addStep({
              type: 'LLM_CALL',
              status: 'PASSED',
              output: {
                phase: 'tool-agent',
                inputTokens: toolResult.output.toolAgentTrace.usage.inputTokens,
                outputTokens: toolResult.output.toolAgentTrace.usage.outputTokens,
                toolCallCount: toolResult.output.toolAgentTrace.toolCalls.length,
                inferredStepOrder: toolResult.output.toolAgentTrace.inferredStepOrder,
              },
            })

            // ===================================================================
            // AGENT 2 + AGENT 3 — Response Agent + Leak Guardrail (retry loop)
            // Máximo 1 retry do Agent 2 quando o guardrail detecta vazamento.
            // ===================================================================
            let finalMessageV2: string | undefined
            let regenerationHint: string | undefined
            let v2AgentTriggeredHandOff = toolResult.output.toolAgentTrace.toolCalls.some(
              (toolCall) => toolCall.toolName === 'hand_off_to_human' || toolCall.toolName === 'transfer_to_agent',
            )
            let pendingHumanHandoff: TriggerHumanHandoffCtx | undefined

            // Agregação de tokens dos 3 subtasks (para adjustCredits no final).
            // Os tipos de output são inferidos pelo SDK — usage.totalTokens pode ser
            // undefined no tipo estático, então usamos ?? 0 em todos os acessos.
            let totalTokensV2 = toolResult.output.toolAgentTrace.usage.totalTokens
            let lastResponseInputTokens = 0
            let lastResponseOutputTokens = 0
            let lastGuardrailInputTokens = 0
            let lastGuardrailOutputTokens = 0

            for (let attempt = 0; attempt <= 1; attempt++) {
              // Renova typing presence a cada attempt — o Evolution expira composing em poucos segundos
              // e o fluxo v2 pode durar 5-15s total (2 subtasks sequenciais por attempt).
              await sendTypingPresence({
                provider: message.provider,
                instanceName: message.instanceName,
                remoteJid: message.remoteJid,
                conversationId,
                organizationId,
              })

              const responseResult = await responseAgent.triggerAndWait({
                modelId: promptBaseContext.modelId,
                promptBaseContext,
                toolContext: toolContextV2,
                llmMessages,
                dataFromTools: toolResult.output.dataFromTools,
                conversationId,
                organizationId,
                phaseTraceId,
                langfuseTraceId,
                langfuseParentSpanId: langfuseSpanId,
                regenerationHint,
              })

              if (!responseResult.ok) {
                await refundCredits(
                  organizationId,
                  estimatedCostV2,
                  'Refund — Response Agent falhou após todos os retries',
                  { agentId: effectiveAgentId, conversationId, phaseTraceId, pipeline: 'v2' },
                ).catch((refundErr) => {
                  logger.error('v2 pipeline: failed to refund after responseAgent failure', {
                    ...baseLogContext,
                    error: refundErr instanceof Error ? refundErr.message : String(refundErr),
                  })
                })
                throw responseResult.error ?? new Error('response-agent subtask failed')
              }

              // Fallback defensivo: Agent 2 retornou customerMessage vazio (edge case)
              if (!responseResult.output.customerMessage?.trim()) {
                logger.warn('v2 pipeline: Agent 2 returned empty customerMessage — falling back', {
                  ...baseLogContext,
                  attempt,
                })
                finalMessageV2 = GENERIC_SAFE_FALLBACK
                v2AgentTriggeredHandOff = true
                pendingHumanHandoff = {
                  conversationId,
                  organizationId,
                  reason: 'Agent 2 retornou mensagem vazia',
                  phaseTraceId,
                }
                lastResponseInputTokens = responseResult.output.usage.inputTokens ?? 0
                lastResponseOutputTokens = responseResult.output.usage.outputTokens ?? 0
                totalTokensV2 += responseResult.output.usage.totalTokens ?? 0
                break
              }

              lastResponseInputTokens = responseResult.output.usage.inputTokens ?? 0
              lastResponseOutputTokens = responseResult.output.usage.outputTokens ?? 0
              totalTokensV2 += responseResult.output.usage.totalTokens ?? 0

              const guardrailResult = await leakGuardrail.triggerAndWait({
                customerMessage: responseResult.output.customerMessage,
                context: {
                  toolsUsed: toolResult.output.toolAgentTrace.toolCalls.map((tc) => tc.toolName),
                  knowledgeQueried: responseResult.output.knowledgeQueried ?? false,
                },
                conversationId,
                organizationId,
                phaseTraceId,
                langfuseTraceId,
                langfuseParentSpanId: langfuseSpanId,
              })

              if (!guardrailResult.ok) {
                await refundCredits(
                  organizationId,
                  estimatedCostV2,
                  'Refund — Leak Guardrail falhou após todos os retries',
                  { agentId: effectiveAgentId, conversationId, phaseTraceId, pipeline: 'v2' },
                ).catch((refundErr) => {
                  logger.error('v2 pipeline: failed to refund after leakGuardrail failure', {
                    ...baseLogContext,
                    error: refundErr instanceof Error ? refundErr.message : String(refundErr),
                  })
                })
                throw guardrailResult.error ?? new Error('leak-guardrail subtask failed')
              }

              lastGuardrailInputTokens = guardrailResult.output.usage.inputTokens ?? 0
              lastGuardrailOutputTokens = guardrailResult.output.usage.outputTokens ?? 0
              totalTokensV2 += guardrailResult.output.usage.totalTokens ?? 0

              // Política de resolução (§1.11 do plano)
              if (!guardrailResult.output.hasLeak) {
                // Sem vazamento — mensagem aprovada
                finalMessageV2 = responseResult.output.customerMessage
                break
              }
              if (guardrailResult.output.sanitized && guardrailResult.output.confidence >= 0.8) {
                // Guardrail sanitizou com alta confiança — usar versão sanitizada
                finalMessageV2 = guardrailResult.output.sanitized
                break
              }
              // Guardrail detectou vazamento mas não sanitizou com confiança suficiente
              // — instruir Agent 2 a reescrever sem mencionar o leak type
              regenerationHint = `A mensagem anterior mencionou ${guardrailResult.output.leakType ?? 'informação interna'}. Reescreva sem isso.`
            }

            // Tokens totais agregados dos 3 subtasks (para adjustCredits).
            // Cada parcela usa ?? 0 para cobrir o caso do último loop não ter executado
            // (ex: break no fallback de customerMessage vazio do Agent 2).
            const inputTokensV2 =
              (toolResult.output.toolAgentTrace.usage.inputTokens ?? 0) +
              lastResponseInputTokens +
              lastGuardrailInputTokens
            const outputTokensV2 =
              (toolResult.output.toolAgentTrace.usage.outputTokens ?? 0) +
              lastResponseOutputTokens +
              lastGuardrailOutputTokens

            const llmDurationMsV2 = Date.now() - llmStartMsV2

            if (!finalMessageV2) {
              // 2ª tentativa ainda vazou — enviar genérico ANTES de pausar a conversa.
              // Ordem crítica: handoff deve acontecer DEPOIS do envio para que o
              // checkAntiAtropelamento não veja aiPaused=true e bloqueie o envio.
              finalMessageV2 = GENERIC_SAFE_FALLBACK
              v2AgentTriggeredHandOff = true
              pendingHumanHandoff = {
                conversationId,
                organizationId,
                reason: 'Guardrail bloqueou resposta 2x seguidas',
                phaseTraceId,
              }
            }

            // Camada defensiva regex — strip de tool calls vazados como texto
            const sanitizedMessageV2 = stripLeakedToolCalls(finalMessageV2)

            // === PASSOS PÓS-LLM ===

            // Passo A — Anti-atropelamento
            const antiAtropel = await checkAntiAtropelamento({
              conversationId,
              organizationId,
              agentId: effectiveAgentId,
              modelId: promptBaseContext.modelId,
              responseText: sanitizedMessageV2,
              inputTokens: inputTokensV2,
              outputTokens: outputTokensV2,
              llmDurationMs: llmDurationMsV2,
              estimatedCost: estimatedCostV2,
              agentTriggeredHandOff: v2AgentTriggeredHandOff,
            })

            if (antiAtropel.paused) {
              tracker.addStep({ type: 'PAUSE_CHECK', status: 'SKIPPED', output: { reason: antiAtropel.skipReason } })
              finalizeTrace('ai_paused_during_generation', {
                metadata: { creditsCost: antiAtropel.actualCost, pipeline: 'v2' },
              })
              await tracker.skip({
                reason: antiAtropel.skipReason ?? 'ai_paused_during_generation',
                creditsCost: antiAtropel.actualCost,
              })
              return { skipped: true, reason: 'ai_paused_during_generation' }
            }
            tracker.addStep({ type: 'PAUSE_CHECK', status: 'PASSED' })

            // Passo I — Tool events do Agent 1 (alimenta timeline do inbox)
            await createToolEventsV2({
              conversationId,
              steps: toolResult.output.toolAgentTrace.toolCalls,
            })

            // Blocos de resposta — loop sequencial (texto + mídia)
            const blocksV2 = parseMessageBlocks(sanitizedMessageV2)
            const inboxV2 = conversationV2.inbox
            const showAttendantNameV2 = inboxV2?.showAttendantName ?? false

            // Guard: inbox é necessário para envio. Se ausente (edge case de dados inconsistentes),
            // loga erro e aborta — não envia resposta parcial ao cliente.
            if (!inboxV2) {
              throw new Error(`v2 pipeline: inbox not found for conversation ${conversationId}`)
            }

            for (const block of blocksV2) {
              if (block.type === 'text') {
                // Passos B + C — persiste mensagem + aplica prefix de atendente
                const { messageId, textSent } = await saveAssistantMessage({
                  conversationId,
                  organizationId,
                  agentId: effectiveAgentId,
                  modelId: promptBaseContext.modelId,
                  text: block.content,
                  inputTokens: inputTokensV2,
                  outputTokens: outputTokensV2,
                  llmDurationMs: llmDurationMsV2,
                  agentName: promptBaseContext.agentName,
                  showAttendantName: showAttendantNameV2,
                })

                // Passo D — envio WhatsApp com routing por provider
                const sendResult = await sendWhatsappMessageV2({
                  conversationId,
                  messageId,
                  credentials: inboxV2,
                  remoteJid: message.remoteJid,
                  text: textSent,
                })

                // Passo E — dedup key no Redis (evita webhook auto-processar a mensagem)
                for (const sentId of sendResult.sentIds) {
                  await dedupOutbound({ sentId, ttlSeconds: 300 })
                }
                continue
              }

              // Bloco de mídia — usa sendMediaUtility com catch por bloco
              try {
                await sendMediaUtility(block.url, block.mediaType, block.caption ?? null, {
                  conversationId,
                  organizationId,
                  remoteJid: message.remoteJid,
                  inboxProvider: inboxV2,
                })
              } catch (mediaError) {
                logger.warn('v2 pipeline: media block send failed, skipping', {
                  ...baseLogContext,
                  url: block.url,
                  mediaType: block.mediaType,
                  error: mediaError instanceof Error ? mediaError.message : String(mediaError),
                })
                updateActiveTrace({
                  tags: ['media-send-failed'],
                  metadata: { failedMediaUrl: block.url, mediaType: block.mediaType },
                })
                triggerMetadata.set('mediaBlockSkipped', true)
              }
            }

            // Passo G — ajuste final de créditos (custo real vs estimado)
            const { actualCost: actualCostV2 } = await adjustCredits({
              organizationId,
              modelId: promptBaseContext.modelId,
              estimatedCost: estimatedCostV2,
              actualTotalTokens: totalTokensV2,
              context: { agentId: effectiveAgentId, conversationId, phaseTraceId },
            })

            // === Persistir currentStepOrder inferido pelo Agent 1 ===
            // V1 tem bug: o campo nunca é escrito. V2 corrige isso aqui.
            const inferredStepOrder = toolResult.output.toolAgentTrace.inferredStepOrder
            if (inferredStepOrder === null) {
              logger.warn('v2 pipeline: Agent 1 returned null inferredStepOrder — keeping current value', {
                ...baseLogContext,
                currentStepOrder: promptBaseContext.currentStepOrder,
              })
              triggerMetadata.set('inferredStepOrderNull', true)
            } else if (inferredStepOrder !== promptBaseContext.currentStepOrder) {
              await db.conversation.update({
                where: { id: conversationId },
                data: { currentStepOrder: inferredStepOrder },
              })
            }

            // Passo F — schedule follow-up (baseado no step atual já atualizado acima)
            await scheduleFollowUp({ conversationId, agentId: effectiveAgentId })

            // Passo H — Execution tracker finalização
            tracker.addStep({ type: 'SEND_MESSAGE', status: 'PASSED' })
            finalizeTrace('completed', {
              metadata: {
                creditsCost: actualCostV2,
                pipeline: 'v2',
                inputTokens: inputTokensV2,
                outputTokens: outputTokensV2,
                llmDurationMs: llmDurationMsV2,
              },
            })
            await tracker.complete({
              modelId: promptBaseContext.modelId,
              inputTokens: inputTokensV2,
              outputTokens: outputTokensV2,
              creditsCost: actualCostV2,
              finishReason: 'stop',
            })

            // === POST-SEND: handoff programático (guardrail escalation) ===
            // Executado APÓS o envio da mensagem — nunca antes, para evitar que
            // aiPaused=true bloqueie o envio do GENERIC_SAFE_FALLBACK ao cliente.
            if (pendingHumanHandoff) {
              try {
                await triggerHumanHandoff(pendingHumanHandoff)
              } catch (handoffError) {
                logger.error('v2 pipeline: deferred human handoff failed after guardrail escalation', {
                  ...baseLogContext,
                  error: handoffError instanceof Error ? handoffError.message : String(handoffError),
                })
              }
            }

            logger.info('v2 pipeline completed', {
              ...baseLogContext,
              llmDurationMs: llmDurationMsV2,
              totalTokens: totalTokensV2,
              actualCost: actualCostV2,
              blockCount: blocksV2.length,
            })

            return { success: true }
          }

          // ===================================================================
          // PIPELINE V1 — Fluxo legado (inalterado)
          // A partir daqui, nenhuma linha do v1 foi modificada.
          // ===================================================================
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
                  metadata: true,
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
                      showAttendantName: true,
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
              let messageContent = msg.content

              // Enriquecer mensagens outbound com transcrição de mídia
              if (msg.role === 'assistant' && msg.metadata) {
                const meta = msg.metadata as Record<string, unknown>
                if (typeof meta.mediaTranscription === 'string' && meta.mediaTranscription.length > 0) {
                  const mediaInfo = meta.media as Record<string, unknown> | undefined
                  const mimetype = mediaInfo?.mimetype as string | undefined
                  const fileName = mediaInfo?.fileName as string | undefined
                  const hasCaption = msg.content !== '[Imagem]'
                    && msg.content !== '[Vídeo]'
                    && !msg.content.startsWith('[Documento:')

                  const captionPart = hasCaption
                    ? ` com mensagem: "${msg.content}"`
                    : ''

                  if (mimetype?.startsWith('image/')) {
                    messageContent = `[Imagem enviada pelo atendente${captionPart} — conteúdo da imagem: ${meta.mediaTranscription}]`
                  } else if (fileName) {
                    messageContent = `[Documento "${fileName}" enviado pelo atendente${captionPart} — conteúdo extraído:\n${meta.mediaTranscription}]`
                  } else {
                    messageContent = `[Mídia enviada pelo atendente${captionPart} — conteúdo: ${meta.mediaTranscription}]`
                  }
                }
              }

              llmMessages.push({
                role: msg.role,
                content: messageContent,
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
              metadata: {
                subtype: 'NO_CREDITS' satisfies ProcessingErrorSubtype,
                estimatedCost,
              },
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
            finalizeTrace('no_credits', { metadata: { estimatedCost } })
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
              hasActiveProducts: promptContext.hasActiveProducts,
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

          // Agentes sem steps não precisam de structured output — comportamento idêntico ao atual
          const hasSteps = promptContext.totalSteps > 0

          const result = await generateText({
            model: getModel(promptContext.modelId),
            messages: llmMessages,
            tools,
            temperature: LLM_TEMPERATURE,
            // Output estruturado exige um step extra no SDK — compensamos com +1
            stopWhen: stepCountIs(4 + (hasSteps ? STEP_OUTPUT_OVERHEAD : 0)),
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            // Quando há steps, forçamos output tipado para separar message de currentStep
            output: hasSteps ? Output.object({ schema: agentOutputSchema }) : undefined,
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

          // Quando Output.object está ativo, result.text do último step é o JSON stringified —
          // não serve como mensagem ao cliente. A mensagem real vem de result.output.message.
          let responseText = hasSteps
            ? (result.output?.message ?? '')
            : result.text

          // Guard de monotonicidade: step só avança, nunca regride.
          // Math.max previne regressão; Math.min previne avanço além do último step.
          const classifiedStep = hasSteps ? result.output?.currentStep : undefined
          const newStepOrder =
            classifiedStep !== undefined
              ? Math.max(
                  promptContext.currentStepOrder,
                  Math.min(classifiedStep, promptContext.totalSteps - 1),
                )
              : promptContext.currentStepOrder
          const stepAdvanced = newStepOrder > promptContext.currentStepOrder

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

          // Strip tool calls vazados como texto puro pelo LLM (ex: Gemini)
          // Deve rodar ANTES da checagem de vazio para que, se tudo era tool JSON,
          // o fluxo de "sem resposta" seja acionado corretamente.
          if (responseText) {
            const sanitized = stripLeakedToolCalls(responseText)
              .replace(/\n{3,}/g, '\n\n')
              .trim()

            if (sanitized.length !== responseText.length) {
              traceTags.push('leaked_tools_stripped')
              log('step:5c sanitize_leaked_tools', 'PASS', {
                originalLength: responseText.length,
                sanitizedLength: sanitized.length,
                strippedChars: responseText.length - sanitized.length,
              })
            }

            responseText = sanitized || ''
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
              metadata: { subtype: 'EMPTY_RESPONSE' satisfies InfoSubtype },
            })
            await revalidateConversationCache(conversationId, organizationId)
            traceTags.push('empty_response')
            triggerMetadata.set('model', promptContext.modelId)
            finalizeTrace('empty_response', {
              metadata: {
                finishReason: result.finishReason,
                creditsCost: emptyActualCost,
                // result.text é o JSON raw quando Output.object ativo — útil para debug
                resultTextLength: result.text?.length ?? 0,
                outputMessageLength: hasSteps ? (result.output?.message?.length ?? 0) : undefined,
              },
            })
            log('step:5 llm_call', 'EXIT', {
              reason: 'empty_response',
              llmDurationMs,
              actualCost: emptyActualCost,
              finishReason: result.finishReason,
              outputTokens: result.usage?.outputTokens ?? 0,
              stepsCount: result.steps?.length ?? 0,
              // result.text pode ser JSON quando Output.object ativo — manter para debug
              resultTextLength: result.text?.length ?? 0,
              outputMessageLength: hasSteps ? (result.output?.message?.length ?? 0) : undefined,
            })
            tracker.addStep({
              type: 'LLM_CALL',
              status: 'FAILED',
              durationMs: llmDurationMs,
              output: {
                reason: 'empty_response',
                resultText: result.text ?? null,
                resultTextLength: result.text?.length ?? 0,
                outputMessageLength: hasSteps ? (result.output?.message?.length ?? 0) : undefined,
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
            classifiedStep,
            newStepOrder,
            stepAdvanced,
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
              metadata: {
                subtype: 'AI_PAUSED_DURING_GENERATION' satisfies InfoSubtype,
              },
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
            finalizeTrace('ai_paused_during_generation', { metadata: { creditsCost: pausedActualCost } })
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
          const textToSend = prefixAttendantName(
            responseText,
            promptContext.agentName,
            conversation.inbox?.showAttendantName ?? false,
          )

          await db.message.create({
            data: {
              conversationId,
              role: 'assistant',
              content: textToSend,
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

          log('step:9 whatsapp_sending', 'PASS', {
            provider: message.provider,
            textLength: textToSend.length,
          })

          if (message.provider === 'simulator') {
            // Simulator: a mensagem do assistente já foi salva no banco no step 8.
            // Não há provider externo — gerar ID fictício apenas para manter consistência
            // com o fluxo de dedup e logging que espera sentMessageIds preenchido.
            sentMessageIds = [`sim_resp_${crypto.randomUUID()}`]
            log('step:9 simulator_send', 'PASS', { textLength: textToSend.length })
          } else if (message.provider === 'meta_cloud') {
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
              textToSend,
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
              textToSend,
            )
          } else {
            // Provider Evolution (default)
            const evolutionCredentials = await resolveEvolutionCredentialsByInstanceName(
              message.instanceName,
            )
            sentMessageIds = await sendWhatsAppMessage(
              message.instanceName,
              message.remoteJid,
              textToSend,
              evolutionCredentials,
            )
          }

          // Pré-registrar dedup keys para que o webhook fromMe ignore estas mensagens
          // (evita duplicata no banco + auto-pause da IA)
          // Simulator não tem webhook — IDs fictícios não precisam ser registrados no Redis
          if (message.provider !== 'simulator') {
            await Promise.all(
              sentMessageIds.map((sentId) =>
                redis.set(`dedup:${sentId}`, '1', 'EX', 300).catch(() => {}),
              ),
            )
          }

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
            // Persistir avanço de step antes de buscar FUPs — garante que o step
            // correto é usado no agendamento e reseta o ciclo de FUP anterior
            if (stepAdvanced) {
              await db.conversation.update({
                where: { id: conversationId },
                data: {
                  currentStepOrder: newStepOrder,
                  // Limpar ciclo de FUP do step anterior ao avançar
                  nextFollowUpAt: null,
                  followUpCount: 0,
                },
              })

              await createConversationEvent({
                conversationId,
                type: 'INFO',
                content: `Conversa avançou para etapa ${newStepOrder + 1}`,
                metadata: {
                  subtype: 'STEP_ADVANCED' satisfies InfoSubtype,
                  previousStep: promptContext.currentStepOrder,
                  newStep: newStepOrder,
                  classifiedByLlm: classifiedStep,
                },
              })

              log('step:10a step_advanced', 'PASS', {
                previousStep: promptContext.currentStepOrder,
                newStep: newStepOrder,
                classifiedStep,
              })
            }

            // newStepOrder já tem o valor correto (currentStepOrder ou avançado)
            // — não precisa mais de findUnique para ler currentStepOrder
            const followUps = await getFollowUpsForStep(
              effectiveAgentId,
              newStepOrder,
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

          triggerMetadata.set('model', promptContext.modelId)
          triggerMetadata.set('stepAdvanced', stepAdvanced)
          triggerMetadata.set('newStepOrder', newStepOrder)
          finalizeTrace('completed', {
            metadata: {
              responseLength: responseText.length,
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
        } catch (unexpectedError) {
          const errorMessage = unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError)
          finalizeTrace('unexpected_error', { metadata: { error: errorMessage } })
          // Re-throw para o Trigger.dev executar os retries normalmente
          throw unexpectedError
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
  // Criar execution FAILED standalone — sem steps (tracker em memória se perdeu nos retries)
  // agentId pode ser '' no modo de grupo com requiresRouting=true — usar null nesses casos
  const failureAgentId = agentId || null

  logger.error('process-agent-message failed after all retries', {
    conversationId,
    messageId: message.messageId,
    organizationId,
    agentId: failureAgentId,
    error: error instanceof Error ? error.message : String(error),
  })
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
      subtype: 'LLM_ERROR' satisfies ProcessingErrorSubtype,
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
      model: getModel(SUMMARIZATION_MODEL_ID),
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
        metadata: { conversationId, model: SUMMARIZATION_MODEL_ID },
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

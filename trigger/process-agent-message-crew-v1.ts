import { task, tasks, logger, metadata as triggerMetadata } from '@trigger.dev/sdk/v3'
import { observe, updateActiveTrace } from '@langfuse/tracing'
import { flushLangfuse } from './lib/langfuse'
import { buildDispatcherCtx } from './lib/build-dispatcher-ctx'
import type { ProcessAgentMessagePayload } from './lib/build-dispatcher-ctx'
import { handleAgentTaskFailure } from './lib/handle-task-failure'
import { db } from '@/_lib/prisma'
import { debitCredits, refundCredits } from '@/_lib/billing/credit-utils'
import { estimateMaxCost } from '@/_lib/ai/pricing'
import { toolAgent } from './agent/tool-agent'
import { responseAgent } from './agent/response-agent'
import { leakGuardrail } from './agent/leak-guardrail'
import { buildPromptBaseContext } from './lib/prompt-base-context'
import { GENERIC_SAFE_FALLBACK } from './lib/two-phase-types'
import type {
  TriggerHumanHandoffCtx,
  ModelMessage,
} from './lib/two-phase-types'
import { sendTypingPresence } from './lib/send-typing-presence'
import { triggerHumanHandoff } from './lib/trigger-human-handoff'
import {
  checkAntiAtropelamento,
  saveAssistantMessage,
  sendWhatsappMessage as sendWhatsappMessageV3,
  dedupOutbound,
  adjustCredits,
  scheduleFollowUp,
  createToolEvents as createToolEventsV3,
} from './lib/post-llm'
import { parseMessageBlocks } from './lib/parse-message-blocks'
import { sendMediaUtility } from './lib/send-media-utility'
import {
  createConversationEvent,
} from './lib/create-conversation-event'
import type {
  InfoSubtype,
  ProcessingErrorSubtype,
} from '@/_lib/conversation-events/types'
import { revalidateConversationCache } from './lib/revalidate-cache'
import { emitAgentStatus } from './lib/emit-agent-status'
import type { ToolContext } from './tools/types'
import type { DispatcherCtx } from './dispatcher-types'

// Limite de mensagens do histórico carregadas para o v3 multi-agente
const MESSAGE_HISTORY_LIMIT_V3 = 12

// Tokens máximos de output por subtask
const MAX_OUTPUT_TOKENS_V3 = 3072

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

// ---------------------------------------------------------------------------
// Pipeline Crew V1 — Multi-agente orquestrado (Tool Agent → Response Agent → Leak Guardrail)
// ---------------------------------------------------------------------------

export async function runCrewV1(
  ctx: DispatcherCtx,
): Promise<{ success: true } | { skipped: true; reason?: string }> {
  // ===================================================================
  // PIPELINE V3 — Multi-agente (Tool Agent → Response Agent → Leak Guardrail)
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
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
    phaseTraceId,
    langfuseTraceId,
    agentId: ctx.effectiveAgentId,
  }

  logger.info('v3 pipeline started', {
    ...baseLogContext,
    pipeline: 'v3',
    messageType: ctx.message.type,
  })

  // groupPromptContext já foi montado acima — convertemos para GroupContext
  // (null quando o agente não pertence a nenhum grupo)
  const groupCtxForV3 = ctx.groupPromptContext
    ? {
        groupId: ctx.groupPromptContext.groupId,
        currentAgentId: ctx.groupPromptContext.currentAgentId,
        workers: ctx.groupPromptContext.workers,
      }
    : null

  // Monta PromptBaseContext 1x — snapshot determinístico reusado pelos 3 subtasks.
  // Retry de qualquer subtask re-usa exatamente o mesmo contexto (§1.9.1 do plano).
  const promptBaseContext = await buildPromptBaseContext(
    ctx.effectiveAgentId,
    ctx.conversationId,
    ctx.organizationId,
    groupCtxForV3,
  )

  // Emite thinking após montar o contexto — client sabe que o pipeline iniciou
  await emitAgentStatus({
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
    state: 'thinking',
    agentName: promptBaseContext.agentName,
  })

  // === Message History v3 — últimas 12 mensagens (sem compressMemory) ===
  // V3 simplifica: 12 mais recentes (desc) + reverse para cronológico.
  // V1 usa até 50 + sumarização via LLM. V3 não precisa do overhead.
  const rawMessageHistory = await db.message.findMany({
    where: { conversationId: ctx.conversationId },
    orderBy: { createdAt: 'desc' },
    take: MESSAGE_HISTORY_LIMIT_V3,
    select: { role: true, content: true, metadata: true },
  })
  rawMessageHistory.reverse() // ordem cronológica (mais antiga primeiro)

  // Enrichment de metadata — mesmo padrão v1 (mediaTranscription inline) +
  // expansão de trajetória de tools em ModelMessages nativos do AI SDK v6.
  //
  // Cada assistant do db.message pode virar N ModelMessages:
  //   - N × { role: 'assistant', content: [tool-call parts] }
  //   - N × { role: 'tool',      content: [tool-result parts] }
  //   - 1 × { role: 'assistant', content: <texto ao cliente> }
  //
  // Isso preserva o sinal estrutural de "ação passada" que o modelo
  // usa nativamente para decidir repetir/não repetir tools entre
  // turnos. O antigo sufixo textual `[ações executadas: ...]` via
  // summarizeTrajectory destruía o sinal de parts e alimentava loops.
  const llmMessages: ModelMessage[] = []
  for (const msg of rawMessageHistory) {
    if (msg.role === 'user') {
      llmMessages.push({ role: 'user', content: msg.content })
      continue
    }

    if (msg.role === 'assistant') {
      const meta = msg.metadata as Record<string, unknown> | null

      let content = msg.content

      // Substituição por transcrição de mídia (padrão pré-existente)
      if (meta && typeof meta.mediaTranscription === 'string' && meta.mediaTranscription.length > 0) {
        content = `[Mídia enviada pelo atendente — conteúdo: ${meta.mediaTranscription}]`
      }

      // Expande agentTrajectory (result.response.messages persistido
      // pelo saveAssistantMessage) em ModelMessages nativos ANTES da
      // mensagem final. Mensagens pré-migração sem agentTrajectory
      // caem no fluxo antigo (apenas content string).
      const trajectory = meta?.agentTrajectory
      if (Array.isArray(trajectory) && trajectory.length > 0) {
        for (const trajMsg of trajectory) {
          if (typeof trajMsg !== 'object' || trajMsg === null) continue
          const role = (trajMsg as { role?: string }).role
          const trajContent = (trajMsg as { content?: unknown }).content
          if (!Array.isArray(trajContent)) continue

          if (role === 'assistant') {
            // Mantém apenas tool-call parts — text parts do
            // tool-agent são descartadas (o texto ao cliente vem
            // da db.message, o rawText do tool-agent é debug-only).
            const toolCallParts = trajContent.filter(
              (part) =>
                typeof part === 'object' &&
                part !== null &&
                (part as { type?: string }).type === 'tool-call',
            )
            if (toolCallParts.length > 0) {
              // Cast: o tipo ModelMessage do AI SDK exige union
              // discriminada de parts (TextPart | ToolCallPart etc).
              // Já filtramos para type === 'tool-call'; o cast é
              // sobre a union não sobre a validade do shape.
              llmMessages.push({
                role: 'assistant',
                content: toolCallParts as never,
              })
            }
            continue
          }

          if (role === 'tool') {
            // Tool results passam inteiros — contraparte estrutural
            // das tool-calls acima, fechando o par para o SDK.
            llmMessages.push({
              role: 'tool',
              content: trajContent as never,
            })
          }
        }
      }

      // Mensagem final do assistant (texto enviado ao cliente)
      llmMessages.push({ role: 'assistant', content })
    }
  }

  // Dados da conversa necessários para o v3 (contactId, dealId, inbox)
  // — query separada pois o Promise.all v1 ainda não foi executado aqui.
  const conversationV3 = await db.conversation.findUniqueOrThrow({
    where: { id: ctx.conversationId },
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
  const toolContextV3: ToolContext = {
    organizationId: ctx.organizationId,
    agentId: ctx.effectiveAgentId,
    agentName: promptBaseContext.agentName,
    conversationId: ctx.conversationId,
    contactId: conversationV3.contactId,
    dealId: conversationV3.dealId,
    pipelineIds: promptBaseContext.pipelineIds,
    remoteJid: conversationV3.remoteJid ?? ctx.message.remoteJid,
    inboxProvider: conversationV3.inbox ?? null,
  }

  // Typing presence antes do Agent 1 — cliente vê "digitando..." imediatamente.
  // O helper trata internamente erros e diferenças de provider.
  await sendTypingPresence({
    provider: ctx.message.provider,
    instanceName: ctx.message.instanceName,
    remoteJid: ctx.message.remoteJid,
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
  })

  // === PRÉ-LLM — estimativa de custo e débito otimista ===
  const MULTI_AGENT_COST_MULTIPLIER = 2.2

  // Estimativa grosseira (chars / 4) — mesma heurística do v1.
  // Com a preservação de tool-call parts, content pode ser string
  // (mensagens textuais) ou array de parts (tool-calls/results).
  // Serializamos arrays com JSON.stringify para aproximar o peso
  // real do payload enviado ao modelo.
  const estimatedInputTokensV3 = Math.ceil(
    llmMessages.reduce((sum, msg) => {
      const length =
        typeof msg.content === 'string'
          ? msg.content.length
          : JSON.stringify(msg.content).length
      return sum + length
    }, 0) / 4,
  )

  // O multiplier 2.2 cobre os 3 subtasks (§4.9 do plano)
  const estimatedCostV3 =
    estimateMaxCost(promptBaseContext.modelId, estimatedInputTokensV3, MAX_OUTPUT_TOKENS_V3) *
    MULTI_AGENT_COST_MULTIPLIER

  const optimisticDebitedV3 = await debitCredits(
    ctx.organizationId,
    estimatedCostV3,
    'Débito otimista — agente IA (v3 multi-agente)',
    {
      agentId: ctx.effectiveAgentId,
      conversationId: ctx.conversationId,
      model: promptBaseContext.modelId,
      estimatedInputTokens: estimatedInputTokensV3,
      estimatedCost: estimatedCostV3,
      type: 'optimistic',
      pipeline: 'v3',
    },
  )

  if (!optimisticDebitedV3) {
    logger.warn('v3 pipeline: no credits', baseLogContext)
    await createConversationEvent({
      conversationId: ctx.conversationId,
      type: 'PROCESSING_ERROR',
      content: 'Créditos de IA insuficientes para processar esta mensagem.',
      metadata: {
        subtype: 'NO_CREDITS' satisfies ProcessingErrorSubtype,
        estimatedCost: estimatedCostV3,
      },
    })

    // Notificar OWNER/ADMIN apenas se não existe notificação não lida nas últimas 24h
    const recentV3CreditNotification = await db.notification.findFirst({
      where: {
        organizationId: ctx.organizationId,
        type: 'SYSTEM',
        title: 'Créditos de IA esgotados',
        readAt: null,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })

    if (!recentV3CreditNotification) {
      const [orgAdminsV3, orgV3] = await Promise.all([
        db.member.findMany({
          where: {
            organizationId: ctx.organizationId,
            role: { in: ['OWNER', 'ADMIN'] },
            status: 'ACCEPTED',
            userId: { not: null },
          },
          select: { userId: true },
        }),
        db.organization.findUnique({
          where: { id: ctx.organizationId },
          select: { slug: true },
        }),
      ])

      if (orgAdminsV3.length > 0) {
        for (const admin of orgAdminsV3) {
          void db.notification.create({
            data: {
              organizationId: ctx.organizationId,
              userId: admin.userId!,
              type: 'SYSTEM',
              title: 'Créditos de IA esgotados',
              body: 'Seus créditos de IA acabaram. Recarregue para continuar usando o agente.',
              actionUrl: orgV3 ? `/org/${orgV3.slug}/settings/billing` : null,
              resourceType: 'credit',
              resourceId: null,
            },
          })
        }
      }
    }

    ctx.tracker.addStep({
      type: 'CREDIT_CHECK',
      status: 'FAILED',
      output: { reason: 'no_credits', estimatedCost: estimatedCostV3, pipeline: 'v3' },
    })
    await revalidateConversationCache(ctx.conversationId, ctx.organizationId)
    ctx.finalizeTrace('no_credits', { metadata: { estimatedCost: estimatedCostV3, pipeline: 'v3' } })
    await ctx.tracker.skip('no_credits')
    await emitAgentStatus({
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      state: 'idle',
      agentName: promptBaseContext.agentName,
      terminalReason: 'skipped',
    })
    return { skipped: true, reason: 'no_credits' }
  }

  ctx.tracker.addStep({
    type: 'CREDIT_CHECK',
    status: 'PASSED',
    output: { estimatedCost: estimatedCostV3, estimatedInputTokens: estimatedInputTokensV3, pipeline: 'v3' },
  })

  const llmStartMsV3 = Date.now()

  // ===================================================================
  // AGENT 1 — Tool Agent
  // Executa tools de CRM/agenda/pesquisa e infere step do funil.
  // ===================================================================

  // Emite running_tool com tool_agent — cliente vê que o agente está atuando
  await emitAgentStatus({
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
    state: 'running_tool',
    agentName: promptBaseContext.agentName,
    toolName: 'tool_agent',
  })

  const toolResult = await toolAgent.triggerAndWait({
    modelId: promptBaseContext.modelId,
    promptBaseContext,
    toolContext: toolContextV3,
    llmMessages,
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
    agentId: ctx.effectiveAgentId,
    phaseTraceId,
    langfuseTraceId,
    langfuseParentSpanId: langfuseSpanId,
  })

  if (!toolResult.ok) {
    // Refund completo — subtask falhou após todos os retries internos
    await refundCredits(
      ctx.organizationId,
      estimatedCostV3,
      'Refund — Tool Agent falhou após todos os retries',
      {
        agentId: ctx.effectiveAgentId,
        conversationId: ctx.conversationId,
        phaseTraceId,
        pipeline: 'v3',
      },
    ).catch((refundErr) => {
      logger.error('v3 pipeline: failed to refund after toolAgent failure', {
        ...baseLogContext,
        error: refundErr instanceof Error ? refundErr.message : String(refundErr),
      })
    })
    throw toolResult.error ?? new Error('tool-agent subtask failed')
  }

  ctx.tracker.addStep({
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
  let finalMessageV3: string | undefined
  let regenerationHint: string | undefined
  let v3AgentTriggeredHandOff = toolResult.output.toolAgentTrace.toolCalls.some(
    (toolCall) => toolCall.toolName === 'hand_off_to_human' || toolCall.toolName === 'transfer_to_agent',
  )
  let pendingHumanHandoff: TriggerHumanHandoffCtx | undefined

  // Agregação de tokens dos 3 subtasks (para adjustCredits no final).
  // Os tipos de output são inferidos pelo SDK — usage.totalTokens pode ser
  // undefined no tipo estático, então usamos ?? 0 em todos os acessos.
  let totalTokensV3 = toolResult.output.toolAgentTrace.usage.totalTokens
  let lastResponseInputTokens = 0
  let lastResponseOutputTokens = 0
  let lastGuardrailInputTokens = 0
  let lastGuardrailOutputTokens = 0

  for (let attempt = 0; attempt <= 1; attempt++) {
    // Renova typing presence a cada attempt — o Evolution expira composing em poucos segundos
    // e o fluxo v3 pode durar 5-15s total (2 subtasks sequenciais por attempt).
    await sendTypingPresence({
      provider: ctx.message.provider,
      instanceName: ctx.message.instanceName,
      remoteJid: ctx.message.remoteJid,
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
    })

    // Emite running_tool com response_agent antes de invocar o subtask
    await emitAgentStatus({
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      state: 'running_tool',
      agentName: promptBaseContext.agentName,
      toolName: 'response_agent',
    })

    const responseResult = await responseAgent.triggerAndWait({
      modelId: promptBaseContext.modelId,
      promptBaseContext,
      toolContext: toolContextV3,
      llmMessages,
      dataFromTools: toolResult.output.dataFromTools,
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      phaseTraceId,
      langfuseTraceId,
      langfuseParentSpanId: langfuseSpanId,
      regenerationHint,
    })

    if (!responseResult.ok) {
      await refundCredits(
        ctx.organizationId,
        estimatedCostV3,
        'Refund — Response Agent falhou após todos os retries',
        { agentId: ctx.effectiveAgentId, conversationId: ctx.conversationId, phaseTraceId, pipeline: 'v3' },
      ).catch((refundErr) => {
        logger.error('v3 pipeline: failed to refund after responseAgent failure', {
          ...baseLogContext,
          error: refundErr instanceof Error ? refundErr.message : String(refundErr),
        })
      })
      throw responseResult.error ?? new Error('response-agent subtask failed')
    }

    // Fallback defensivo: Agent 2 retornou customerMessage vazio (edge case)
    if (!responseResult.output.customerMessage?.trim()) {
      logger.warn('v3 pipeline: Agent 2 returned empty customerMessage — falling back', {
        ...baseLogContext,
        attempt,
      })
      finalMessageV3 = GENERIC_SAFE_FALLBACK
      v3AgentTriggeredHandOff = true
      pendingHumanHandoff = {
        conversationId: ctx.conversationId,
        organizationId: ctx.organizationId,
        reason: 'Agent 2 retornou mensagem vazia',
        phaseTraceId,
      }
      lastResponseInputTokens = responseResult.output.usage.inputTokens ?? 0
      lastResponseOutputTokens = responseResult.output.usage.outputTokens ?? 0
      totalTokensV3 += responseResult.output.usage.totalTokens ?? 0
      break
    }

    lastResponseInputTokens = responseResult.output.usage.inputTokens ?? 0
    lastResponseOutputTokens = responseResult.output.usage.outputTokens ?? 0
    totalTokensV3 += responseResult.output.usage.totalTokens ?? 0

    // Emite running_tool com leak_guardrail antes de invocar o subtask
    await emitAgentStatus({
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      state: 'running_tool',
      agentName: promptBaseContext.agentName,
      toolName: 'leak_guardrail',
    })

    const guardrailResult = await leakGuardrail.triggerAndWait({
      customerMessage: responseResult.output.customerMessage,
      context: {
        toolsUsed: toolResult.output.toolAgentTrace.toolCalls.map((tc) => tc.toolName),
        knowledgeQueried: responseResult.output.knowledgeQueried ?? false,
      },
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      phaseTraceId,
      langfuseTraceId,
      langfuseParentSpanId: langfuseSpanId,
    })

    if (!guardrailResult.ok) {
      await refundCredits(
        ctx.organizationId,
        estimatedCostV3,
        'Refund — Leak Guardrail falhou após todos os retries',
        { agentId: ctx.effectiveAgentId, conversationId: ctx.conversationId, phaseTraceId, pipeline: 'v3' },
      ).catch((refundErr) => {
        logger.error('v3 pipeline: failed to refund after leakGuardrail failure', {
          ...baseLogContext,
          error: refundErr instanceof Error ? refundErr.message : String(refundErr),
        })
      })
      throw guardrailResult.error ?? new Error('leak-guardrail subtask failed')
    }

    lastGuardrailInputTokens = guardrailResult.output.usage.inputTokens ?? 0
    lastGuardrailOutputTokens = guardrailResult.output.usage.outputTokens ?? 0
    totalTokensV3 += guardrailResult.output.usage.totalTokens ?? 0

    // Política de resolução (§1.11 do plano)
    if (!guardrailResult.output.hasLeak) {
      // Sem vazamento — mensagem aprovada
      finalMessageV3 = responseResult.output.customerMessage
      break
    }
    if (guardrailResult.output.sanitized && guardrailResult.output.confidence >= 0.8) {
      // Guardrail sanitizou com alta confiança — usar versão sanitizada
      finalMessageV3 = guardrailResult.output.sanitized
      break
    }
    // Guardrail detectou vazamento mas não sanitizou com confiança suficiente
    // — instruir Agent 2 a reescrever sem mencionar o leak type
    regenerationHint = `A mensagem anterior mencionou ${guardrailResult.output.leakType ?? 'informação interna'}. Reescreva sem isso.`
  }

  // Tokens totais agregados dos 3 subtasks (para adjustCredits).
  // Cada parcela usa ?? 0 para cobrir o caso do último loop não ter executado
  // (ex: break no fallback de customerMessage vazio do Agent 2).
  const inputTokensV3 =
    (toolResult.output.toolAgentTrace.usage.inputTokens ?? 0) +
    lastResponseInputTokens +
    lastGuardrailInputTokens
  const outputTokensV3 =
    (toolResult.output.toolAgentTrace.usage.outputTokens ?? 0) +
    lastResponseOutputTokens +
    lastGuardrailOutputTokens

  const llmDurationMsV3 = Date.now() - llmStartMsV3

  if (!finalMessageV3) {
    // 2ª tentativa ainda vazou — enviar genérico ANTES de pausar a conversa.
    // Ordem crítica: handoff deve acontecer DEPOIS do envio para que o
    // checkAntiAtropelamento não veja aiPaused=true e bloqueie o envio.
    finalMessageV3 = GENERIC_SAFE_FALLBACK
    v3AgentTriggeredHandOff = true
    pendingHumanHandoff = {
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      reason: 'Guardrail bloqueou resposta 2x seguidas',
      phaseTraceId,
    }
  }

  // Camada defensiva regex — strip de tool calls vazados como texto
  const sanitizedMessageV3 = stripLeakedToolCalls(finalMessageV3)

  // === PASSOS PÓS-LLM ===

  // Passo A — Anti-atropelamento
  const antiAtropel = await checkAntiAtropelamento({
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
    agentId: ctx.effectiveAgentId,
    modelId: promptBaseContext.modelId,
    responseText: sanitizedMessageV3,
    inputTokens: inputTokensV3,
    outputTokens: outputTokensV3,
    llmDurationMs: llmDurationMsV3,
    estimatedCost: estimatedCostV3,
    agentTriggeredHandOff: v3AgentTriggeredHandOff,
  })

  if (antiAtropel.paused) {
    ctx.tracker.addStep({ type: 'PAUSE_CHECK', status: 'SKIPPED', output: { reason: antiAtropel.skipReason } })
    ctx.finalizeTrace('ai_paused_during_generation', {
      metadata: { creditsCost: antiAtropel.actualCost, pipeline: 'v3' },
    })
    await ctx.tracker.skip({
      reason: antiAtropel.skipReason ?? 'ai_paused_during_generation',
      creditsCost: antiAtropel.actualCost,
    })
    await emitAgentStatus({
      conversationId: ctx.conversationId,
      organizationId: ctx.organizationId,
      state: 'idle',
      agentName: promptBaseContext.agentName,
      terminalReason: 'skipped',
    })
    return { skipped: true, reason: 'ai_paused_during_generation' }
  }
  ctx.tracker.addStep({ type: 'PAUSE_CHECK', status: 'PASSED' })

  // Passo I — Tool events do Agent 1 (alimenta timeline do inbox)
  await createToolEventsV3({
    conversationId: ctx.conversationId,
    steps: toolResult.output.toolAgentTrace.toolCalls,
  })

  // Blocos de resposta — loop sequencial (texto + mídia)
  const blocksV3 = parseMessageBlocks(sanitizedMessageV3)
  const inboxV3 = conversationV3.inbox
  const showAttendantNameV3 = inboxV3?.showAttendantName ?? false

  // Guard: inbox é necessário para envio. Se ausente (edge case de dados inconsistentes),
  // loga erro e aborta — não envia resposta parcial ao cliente.
  if (!inboxV3) {
    throw new Error(`v3 pipeline: inbox not found for conversation ${ctx.conversationId}`)
  }

  // A trajetória pertence ao turno (não ao bloco) — grava só na primeira
  // message de texto para não duplicar o array nos blocos subsequentes.
  let trajectoryPersisted = false

  // Emite composing antes de persistir/enviar os blocos ao cliente
  await emitAgentStatus({
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
    state: 'composing',
    agentName: promptBaseContext.agentName,
  })

  for (const block of blocksV3) {
    if (block.type === 'text') {
      // Passos B + C — persiste mensagem + aplica prefix de atendente
      const { messageId, textSent } = await saveAssistantMessage({
        conversationId: ctx.conversationId,
        organizationId: ctx.organizationId,
        agentId: ctx.effectiveAgentId,
        modelId: promptBaseContext.modelId,
        text: block.content,
        inputTokens: inputTokensV3,
        outputTokens: outputTokensV3,
        llmDurationMs: llmDurationMsV3,
        agentName: promptBaseContext.agentName,
        showAttendantName: showAttendantNameV3,
        agentTrajectory: trajectoryPersisted
          ? undefined
          : toolResult.output.responseMessages,
      })
      trajectoryPersisted = true

      // Passo D — envio WhatsApp com routing por provider
      const sendResult = await sendWhatsappMessageV3({
        conversationId: ctx.conversationId,
        messageId,
        credentials: inboxV3,
        remoteJid: ctx.message.remoteJid,
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
        conversationId: ctx.conversationId,
        organizationId: ctx.organizationId,
        remoteJid: ctx.message.remoteJid,
        inboxProvider: inboxV3,
      })
    } catch (mediaError) {
      logger.warn('v3 pipeline: media block send failed, skipping', {
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
  const { actualCost: actualCostV3 } = await adjustCredits({
    organizationId: ctx.organizationId,
    modelId: promptBaseContext.modelId,
    estimatedCost: estimatedCostV3,
    actualTotalTokens: totalTokensV3,
    context: { agentId: ctx.effectiveAgentId, conversationId: ctx.conversationId, phaseTraceId },
  })

  // === Classificação de step pelo Agent 1 + persistência com guards ===
  // Paridade com v1 (:1812-1826 + :2368-2449): monotonicidade, clamp,
  // reset explícito de FUP quando avança e evento STEP_ADVANCED.
  const classifiedStepId =
    toolResult.output.toolAgentTrace.classifiedStepId
  const inferredStepOrderV3 =
    toolResult.output.toolAgentTrace.inferredStepOrder
  const totalStepsV3 = promptBaseContext.steps.length
  const previousStepOrderV3 = promptBaseContext.currentStepOrder

  // Guard de monotonicidade + clamp ao teto (espelha v1:1819-1825).
  // Step só avança; nunca regride — protege contra classificações ambíguas.
  const newStepOrderV3 =
    inferredStepOrderV3 !== null && totalStepsV3 > 0
      ? Math.max(
          previousStepOrderV3,
          Math.min(inferredStepOrderV3, totalStepsV3 - 1),
        )
      : previousStepOrderV3
  const stepAdvancedV3 = newStepOrderV3 > previousStepOrderV3

  if (stepAdvancedV3) {
    await db.conversation.update({
      where: { id: ctx.conversationId },
      data: {
        currentStepOrder: newStepOrderV3,
        // Reset explícito do ciclo de FUP do step anterior (v1:2372-2376)
        nextFollowUpAt: null,
        followUpCount: 0,
      },
    })

    await createConversationEvent({
      conversationId: ctx.conversationId,
      type: 'INFO',
      content: `Conversa avançou para etapa ${newStepOrderV3 + 1}`,
      metadata: {
        subtype: 'STEP_ADVANCED' satisfies InfoSubtype,
        previousStep: previousStepOrderV3,
        newStep: newStepOrderV3,
        newStepId: promptBaseContext.steps[newStepOrderV3]?.id,
        newStepName: promptBaseContext.steps[newStepOrderV3]?.name,
        classifiedByLlm: classifiedStepId,
      },
    })
  }

  // Log dedicado para classificação ausente — informativo, não bloqueia fluxo.
  if (!stepAdvancedV3 && inferredStepOrderV3 === null) {
    logger.warn(
      'v3 pipeline: Agent 1 returned null currentStep — keeping current value',
      {
        ...baseLogContext,
        currentStepOrder: previousStepOrderV3,
      },
    )
    triggerMetadata.set('inferredStepNull', true)
  }

  // Passo F — schedule follow-up com stepOrder autoritativo (evita findUnique)
  await scheduleFollowUp({
    conversationId: ctx.conversationId,
    agentId: ctx.effectiveAgentId,
    stepOrder: newStepOrderV3,
  })

  // Passo H — Execution tracker finalização
  ctx.tracker.addStep({ type: 'SEND_MESSAGE', status: 'PASSED' })
  ctx.finalizeTrace('completed', {
    metadata: {
      creditsCost: actualCostV3,
      pipeline: 'v3',
      inputTokens: inputTokensV3,
      outputTokens: outputTokensV3,
      llmDurationMs: llmDurationMsV3,
    },
  })
  await ctx.tracker.complete({
    modelId: promptBaseContext.modelId,
    inputTokens: inputTokensV3,
    outputTokens: outputTokensV3,
    creditsCost: actualCostV3,
    finishReason: 'stop',
  })

  // === POST-SEND: handoff programático (guardrail escalation) ===
  // Executado APÓS o envio da mensagem — nunca antes, para evitar que
  // aiPaused=true bloqueie o envio do GENERIC_SAFE_FALLBACK ao cliente.
  if (pendingHumanHandoff) {
    try {
      await triggerHumanHandoff(pendingHumanHandoff)
    } catch (handoffError) {
      logger.error('v3 pipeline: deferred human handoff failed after guardrail escalation', {
        ...baseLogContext,
        error: handoffError instanceof Error ? handoffError.message : String(handoffError),
      })
    }
  }

  logger.info('v3 pipeline completed', {
    ...baseLogContext,
    llmDurationMs: llmDurationMsV3,
    totalTokens: totalTokensV3,
    actualCost: actualCostV3,
    blockCount: blocksV3.length,
  })

  await emitAgentStatus({
    conversationId: ctx.conversationId,
    organizationId: ctx.organizationId,
    state: 'idle',
    agentName: promptBaseContext.agentName,
    terminalReason: 'completed',
  })

  return { success: true }
}

// ---------------------------------------------------------------------------
// Task Trigger.dev — registra esta pipeline como task independente
// ---------------------------------------------------------------------------

export const processAgentMessageCrewV1 = task({
  id: 'process-agent-message-crew-v1',
  retry: { maxAttempts: 3 },
  run: async (payload: ProcessAgentMessagePayload, { ctx: triggerCtx }) => {
    return observe(async () => {
      const dispatchResult = await buildDispatcherCtx(payload, triggerCtx)
      try {
        if ('skipped' in dispatchResult) return dispatchResult
        return await runCrewV1(dispatchResult.ctx)
      } finally {
        // Emite idle com failed antes do flushLangfuse — idempotente se completed já foi emitido
        if (!('skipped' in dispatchResult)) {
          await emitAgentStatus({
            conversationId: dispatchResult.ctx.conversationId,
            organizationId: dispatchResult.ctx.organizationId,
            state: 'idle',
            agentName: 'Agente',
            terminalReason: 'failed',
          })
        }
        await flushLangfuse()
      }
    }, { name: 'process-agent-message-crew-v1' })()
  },
  onFailure: async ({ payload, error }) =>
    handleAgentTaskFailure('process-agent-message-crew-v1', { payload, error }),
})

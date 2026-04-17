import { schedules, logger, metadata as triggerMetadata } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { checkBusinessHours } from '@/_lib/agent/check-business-hours'
import { getFollowUpsForStep } from '@/_data-access/follow-up/get-follow-ups-for-step'
import type { ConnectionType, Prisma } from '@prisma/client'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'
import type { InfoSubtype } from '@/_lib/conversation-events/types'

const BATCH_SIZE = 50

// Mapeamento de índice de dia da semana para chave do config (domingo=0)
const DAY_KEYS: (keyof BusinessHoursConfig)[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

// ---------------------------------------------------------------------------
// Tipos internos para as conversas do batch
// ---------------------------------------------------------------------------

interface ConvInboxAgent {
  id: string
  followUpBusinessHoursEnabled: boolean
  followUpBusinessHoursConfig: Prisma.JsonValue
  followUpBusinessHoursTimezone: string
  followUpExhaustedAction: string
  followUpExhaustedConfig: Prisma.JsonValue
}

interface ConvInbox {
  id: string
  isActive: boolean
  connectionType: ConnectionType
  evolutionInstanceName: string | null
  evolutionApiUrl: string | null
  evolutionApiKey: string | null
  metaPhoneNumberId: string | null
  metaAccessToken: string | null
  zapiInstanceId: string | null
  zapiToken: string | null
  zapiClientToken: string | null
  agentId: string | null
  agentGroupId: string | null
  agent: ConvInboxAgent | null
}

interface ConvForCron {
  id: string
  remoteJid: string | null
  organizationId: string
  dealId: string | null
  followUpCount: number
  currentStepOrder: number
  // Necessário para resolver o worker ativo quando inbox usa agentGroupId
  activeAgentId: string | null
  inbox: ConvInbox
}

// ---------------------------------------------------------------------------
// Business Hours helpers para Follow-Up
// ---------------------------------------------------------------------------

/**
 * Calcula o próximo momento de abertura do horário comercial de follow-up.
 * Busca o primeiro dia (a partir de hoje) que tenha horário habilitado e retorna
 * um Date apontando para o startTime daquele dia no timezone correto.
 *
 * Estratégia:
 * - Se hoje tem horário e já passou do fim → próximo dia válido
 * - Se hoje não tem horário → próximo dia válido
 * - Se hoje tem horário mas ainda não começou → hoje mesmo no startTime
 * - Máximo de 8 iterações (previne loop infinito se config for inválida)
 */
function getNextFollowUpOpeningTime(timezone: string, config: BusinessHoursConfig): Date {
  const now = new Date()
  const MAX_DAYS_AHEAD = 8

  for (let daysAhead = 0; daysAhead < MAX_DAYS_AHEAD; daysAhead++) {
    // Calcular a data candidata (hoje + daysAhead dias)
    const candidateUtc = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    // Resolver o dia da semana e hora atual no timezone alvo
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hour12: false,
    })

    const parts = formatter.formatToParts(candidateUtc)
    const weekdayStr = parts.find((part) => part.type === 'weekday')?.value ?? ''

    // Mapear abreviação de dia para índice 0-6
    const WEEKDAY_MAP: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    }
    const dayIndex = WEEKDAY_MAP[weekdayStr]
    if (dayIndex === undefined) continue

    const dayKey = DAY_KEYS[dayIndex]
    const dayConfig = config[dayKey]

    // Se o dia não está habilitado, pular para o próximo
    if (!dayConfig || !dayConfig.enabled) continue

    // Parsear startTime (formato "HH:mm")
    const [startHour, startMin] = dayConfig.start.split(':').map(Number)

    // Calcular o offset UTC do timezone no dia candidato usando getTimezoneOffset
    // Usamos a data local para inferir o offset via diferença UTC vs local
    const offsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
    const offsetParts = offsetFormatter.formatToParts(candidateUtc)
    const tzName = offsetParts.find((part) => part.type === 'timeZoneName')?.value ?? ''

    // Parsear GMT+HH:MM ou GMT-HH:MM
    let offsetTotalMinutes = 0
    const match = tzName.match(/GMT([+-])(\d{1,2}):?(\d{0,2})/)
    if (match) {
      const isNegative = match[1] === '-'
      const cleanStr = `${match[2]}:${match[3] || '00'}`
      const parts2 = cleanStr.split(':')
      const hours = parseInt(parts2[0], 10)
      const minutes = parts2[1] ? parseInt(parts2[1], 10) : 0
      offsetTotalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes)
    }

    // Obter a data local (no timezone alvo) do dia candidato
    const candidateLocalFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const candidateLocalDate = candidateLocalFormatter.format(candidateUtc)
    // Formato esperado: MM/DD/YYYY
    const [monthStr, dayStr, yearStr] = candidateLocalDate.split('/')

    const targetYear = parseInt(yearStr, 10)
    const targetMonth = parseInt(monthStr, 10) - 1
    const targetDay = parseInt(dayStr, 10)

    // UTC = local_datetime - tzOffset
    const utcMs =
      Date.UTC(targetYear, targetMonth, targetDay, startHour, startMin, 0) -
      offsetTotalMinutes * 60 * 1000

    const result = new Date(utcMs)

    // Sanity check: resultado deve ser no futuro (edge case: DST pode deslocar)
    if (result > now) return result

    // Resultado no passado (edge case de DST) — tentar próximo dia
    continue
  }

  // Fallback: nenhum dia com horário habilitado nos próximos 7 dias — adiar 24h
  logger.warn('[follow-up-cron] No business hours enabled in next 7 days, deferring 24h', {
    timezone,
    enabledDays: Object.entries(config).filter(([, day]) => day.enabled).map(([key]) => key),
  })
  return new Date(now.getTime() + 24 * 60 * 60 * 1000)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Revalidar cache da conversa via API interna (não usar revalidateTag — roda fora do Next.js)
async function revalidateConversationCache(conversationId: string, organizationId: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  const secret = process.env.INTERNAL_API_SECRET

  if (!appUrl || !secret) {
    logger.warn('[follow-up-cron] Missing NEXT_PUBLIC_APP_URL or INTERNAL_API_SECRET, skipping cache revalidation')
    return
  }

  const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`

  await fetch(`${baseUrl}/api/inbox/revalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ conversationId, organizationId }),
  }).catch(() => {})
}

// Tipos auxiliares para a config de esgotamento
interface ExhaustedConfig {
  targetStageId?: string
  notifyTarget?: 'deal_assignee' | 'specific_number'
  specificPhone?: string
}

// Executar ação configurada quando todos os follow-ups de um agente são esgotados.
// Recebe o agent resolvido explicitamente para suportar tanto modo standalone quanto grupo.
async function executeExhaustedAction(
  conv: ConvForCron,
  now: Date,
  agent: ConvInboxAgent,
): Promise<void> {
  const exhaustedAction = agent.followUpExhaustedAction
  const config = agent.followUpExhaustedConfig as ExhaustedConfig | null

  if (exhaustedAction === 'NONE') return

  if (exhaustedAction === 'NOTIFY_HUMAN') {
    // Pausar a IA para que um humano assuma a conversa
    await db.conversation.update({
      where: { id: conv.id },
      data: { aiPaused: true, pausedAt: now },
    })

    // Registrar evento visível ao usuário
    await db.conversationEvent.create({
      data: {
        conversationId: conv.id,
        type: 'INFO',
        toolName: 'follow_up',
        content: 'Follow-up esgotado. Conversa transferida para atendimento humano.',
        visibleToUser: true,
        metadata: {
          subtype: 'FOLLOW_UP_EXHAUSTED_NOTIFY' satisfies InfoSubtype,
          notifyTarget: config?.notifyTarget ?? 'deal_assignee',
          specificPhone: config?.specificPhone ?? null,
        } as Prisma.InputJsonValue,
      },
    }).catch(() => {})
    return
  }

  if (exhaustedAction === 'MOVE_DEAL_STAGE') {
    const targetStageId = config?.targetStageId
    if (!conv.dealId || !targetStageId) return

    await db.deal.update({
      where: { id: conv.dealId },
      data: { pipelineStageId: targetStageId },
    }).catch(() => {})

    await db.conversationEvent.create({
      data: {
        conversationId: conv.id,
        type: 'INFO',
        toolName: 'follow_up',
        content: 'Follow-up esgotado. Negócio movido para nova etapa.',
        visibleToUser: true,
        metadata: {
          subtype: 'FOLLOW_UP_EXHAUSTED_MOVE_DEAL' satisfies InfoSubtype,
          dealId: conv.dealId,
          targetStageId,
        } as Prisma.InputJsonValue,
      },
    }).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Cron principal
// ---------------------------------------------------------------------------

// Cron a cada 3 minutos — balanceia responsividade vs custo de execução
// Schedule configurado via Trigger.dev Dashboard: cron expression `*/3 * * * *`
export const followUpCron = schedules.task({
  id: 'follow-up-cron',
  cron: '*/3 * * * *',
  run: async () => {
    const now = new Date()

    // 1. Query indexada: buscar conversas com FUP vencido
    // O índice @@index([nextFollowUpAt, aiPaused]) garante performance
    const conversations = await db.conversation.findMany({
      where: {
        nextFollowUpAt: { lte: now },
        aiPaused: false,
        OR: [
          { inbox: { agentId: { not: null }, agent: { isActive: true } } },
          { inbox: { agentGroupId: { not: null }, agentGroup: { isActive: true } } },
        ],
      },
      select: {
        id: true,
        remoteJid: true,
        organizationId: true,
        dealId: true,
        followUpCount: true,
        currentStepOrder: true,
        // Necessário para resolver o worker ativo em conversas que usam agentGroupId
        activeAgentId: true,
        inbox: {
          select: {
            id: true,
            isActive: true,
            connectionType: true,
            evolutionInstanceName: true,
            evolutionApiUrl: true,
            evolutionApiKey: true,
            metaPhoneNumberId: true,
            metaAccessToken: true,
            zapiInstanceId: true,
            zapiToken: true,
            zapiClientToken: true,
            agentId: true,
            agentGroupId: true,
            agent: {
              select: {
                id: true,
                followUpBusinessHoursEnabled: true,
                followUpBusinessHoursConfig: true,
                followUpBusinessHoursTimezone: true,
                followUpExhaustedAction: true,
                followUpExhaustedConfig: true,
              },
            },
          },
        },
      },
      take: BATCH_SIZE,
      orderBy: { nextFollowUpAt: 'asc' }, // Processar mais antigos primeiro
    })

    triggerMetadata.set('batchSize', conversations.length)

    if (conversations.length === 0) {
      return { processed: 0, skipped: 0, errors: 0, total: 0 }
    }

    logger.info('[follow-up-cron] Processing batch', { batchSize: conversations.length })

    let processed = 0
    let skipped = 0
    let errors = 0

    for (const conv of conversations) {
      // Helper de log — campos estruturados, nunca IDs embutidos na string
      const log = (
        step: string,
        outcome: 'SENT' | 'SKIP' | 'ERROR',
        extra?: Record<string, unknown>,
      ) => logger.info(`[fup] ${step} → ${outcome}`, { convId: conv.id, organizationId: conv.organizationId, ...extra })

      try {
        // Validar: inbox ativa e remoteJid disponível
        if (!conv.inbox.isActive || !conv.remoteJid) {
          // Limpar estado completo — inbox inativa não pode processar FUPs
          await db.conversation.update({
            where: { id: conv.id },
            data: { nextFollowUpAt: null, followUpCount: 0 },
          })
          log('conversation_check', 'SKIP', { reason: !conv.inbox.isActive ? 'inbox_inactive' : 'no_remote_jid' })
          skipped++
          continue
        }

        // Resolver agentId:
        // - Modo standalone: inbox.agentId
        // - Modo grupo: conversation.activeAgentId (worker classificado pelo router)
        // - Se nenhum dos dois estiver preenchido, a conversa ainda não foi classificada → skip
        const agentId = conv.inbox.agentId ?? conv.activeAgentId
        if (!agentId) {
          log('agent_resolve', 'SKIP', { reason: 'no_active_agent_not_yet_routed' })
          skipped++
          continue
        }

        // Para o modo grupo, o agent config vem de um lookup separado
        // (inbox.agent só é populado quando inbox tem agentId direto)
        let resolvedAgent = conv.inbox.agent

        if (!resolvedAgent && conv.activeAgentId) {
          // Conversa usa agentGroupId → buscar config do worker ativo
          const workerFromGroup = await db.agent.findUnique({
            where: { id: conv.activeAgentId },
            select: {
              id: true,
              followUpBusinessHoursEnabled: true,
              followUpBusinessHoursConfig: true,
              followUpBusinessHoursTimezone: true,
              followUpExhaustedAction: true,
              followUpExhaustedConfig: true,
            },
          })

          if (!workerFromGroup) {
            log('agent_resolve', 'SKIP', { reason: 'worker_not_found', workerId: conv.activeAgentId })
            skipped++
            continue
          }

          resolvedAgent = workerFromGroup
        }

        if (!resolvedAgent) {
          // inbox tem agentId mas agent foi deletado — limpar estado
          await db.conversation.update({
            where: { id: conv.id },
            data: { nextFollowUpAt: null, followUpCount: 0 },
          })
          log('agent_resolve', 'SKIP', { reason: 'agent_deleted' })
          skipped++
          continue
        }

        // 2. Resolver follow-ups ativos para o step atual da conversa (modelo flat)
        // getFollowUpsForStep acessa o banco diretamente (sem cache) — seguro para Trigger.dev
        const followUps = await getFollowUpsForStep(agentId, conv.currentStepOrder)

        if (followUps.length === 0) {
          // Nenhum follow-up cobre este step — limpar estado
          await db.conversation.update({
            where: { id: conv.id },
            data: { nextFollowUpAt: null, followUpCount: 0 },
          })
          log('followup_lookup', 'SKIP', { reason: 'no_follow_ups_for_step', stepOrder: conv.currentStepOrder })
          skipped++
          continue
        }

        // followUpCount é o índice no array ordenado por order
        const currentFollowUp = followUps[conv.followUpCount]

        if (!currentFollowUp) {
          // Todos os follow-ups esgotados — executar ação configurada no Agent resolvido
          await executeExhaustedAction(conv, now, resolvedAgent)

          // Limpar estado de FUP (independente da ação executada)
          await db.conversation.update({
            where: { id: conv.id },
            data: { nextFollowUpAt: null, followUpCount: 0 },
          })
          log('followup_lookup', 'SKIP', { reason: 'all_exhausted', followUpCount: conv.followUpCount })
          skipped++
          continue
        }

        // Race condition check: re-verificar estado atual antes de enviar
        // O cliente pode ter respondido entre a leitura do batch e este ponto
        const freshConv = await db.conversation.findUnique({
          where: { id: conv.id },
          select: { nextFollowUpAt: true, aiPaused: true, followUpCount: true, currentStepOrder: true },
        })

        const hasFupChanged =
          !freshConv ||
          !freshConv.nextFollowUpAt ||
          freshConv.aiPaused ||
          freshConv.followUpCount !== conv.followUpCount

        if (hasFupChanged) {
          log('race_condition_check', 'SKIP', { reason: 'state_changed_since_batch' })
          skipped++
          continue
        }

        // Rede de segurança: se o LLM classificou um novo step durante uma mensagem
        // recebida após a leitura do batch, os FUPs carregados são do step antigo e
        // não devem ser enviados — abortar e limpar o ciclo para que o process-agent-message
        // reagende com os FUPs corretos do step novo.
        if (freshConv.currentStepOrder !== conv.currentStepOrder) {
          await db.conversation.update({
            where: { id: conv.id },
            data: { nextFollowUpAt: null, followUpCount: 0 },
          })
          log('step_mismatch_check', 'SKIP', {
            reason: 'stage_mismatch_aborted',
            batchStep: conv.currentStepOrder,
            currentStep: freshConv.currentStepOrder,
          })
          skipped++
          continue
        }

        // Business hours check para follow-up — usa config do agent resolvido
        // (pode ser o agente direto do inbox ou o worker ativo do grupo)
        if (resolvedAgent.followUpBusinessHoursEnabled && resolvedAgent.followUpBusinessHoursConfig) {
          // Validar que o config é um objeto válido antes de fazer cast — JSON pode ser malformado
          if (
            typeof resolvedAgent.followUpBusinessHoursConfig !== 'object' ||
            resolvedAgent.followUpBusinessHoursConfig === null ||
            Array.isArray(resolvedAgent.followUpBusinessHoursConfig)
          ) {
            logger.warn('[follow-up-cron] Invalid FUP business hours config', { convId: conv.id })
          } else {
            const bhConfig = resolvedAgent.followUpBusinessHoursConfig as BusinessHoursConfig
            const timezone = resolvedAgent.followUpBusinessHoursTimezone

            // Reutiliza checkBusinessHours do helper do agente (elimina duplicação)
            const isOpen = checkBusinessHours(timezone, bhConfig)

            if (!isOpen) {
              // Calcular próximo momento de abertura e reagendar o FUP
              const nextOpeningTime = getNextFollowUpOpeningTime(timezone, bhConfig)

              await db.conversation.update({
                where: { id: conv.id },
                data: { nextFollowUpAt: nextOpeningTime },
              })

              log('business_hours_check', 'SKIP', {
                reason: 'outside_business_hours',
                timezone,
                nextOpeningTime: nextOpeningTime.toISOString(),
              })
              skipped++
              continue
            }
          }
        }

        // 3. Guard SIMULATOR: não há provider WhatsApp real — salvar mensagem diretamente no banco.
        // Conversas simuladas existem apenas no inbox local; envio externo causaria erro de credenciais.
        if (conv.inbox.connectionType === 'SIMULATOR') {
          log('fup_sending', 'SENT', {
            followUpIndex: conv.followUpCount,
            connectionType: 'SIMULATOR',
            textLength: currentFollowUp.messageContent.length,
          })

          // Salvar FUP como mensagem do assistant (o usuário vê no inbox normalmente)
          await db.message.create({
            data: {
              conversationId: conv.id,
              role: 'assistant',
              content: currentFollowUp.messageContent,
              providerMessageId: `sim_fup_${crypto.randomUUID()}`,
              metadata: {
                source: 'follow_up',
                followUpId: currentFollowUp.id,
                followUpOrder: currentFollowUp.order,
                mode: 'simulator',
              } as Prisma.InputJsonValue,
            },
          })

          // Registrar evento visível ao usuário
          await db.conversationEvent.create({
            data: {
              conversationId: conv.id,
              type: 'INFO',
              toolName: 'follow_up',
              content: `Follow-up #${conv.followUpCount + 1} enviado automaticamente`,
              visibleToUser: true,
              metadata: {
                subtype: 'FOLLOW_UP_SENT' satisfies InfoSubtype,
                followUpId: currentFollowUp.id,
                followUpOrder: currentFollowUp.order,
                delayMinutes: currentFollowUp.delayMinutes,
              } as Prisma.InputJsonValue,
            },
          })

          // Agendar próximo FUP ou finalizar ciclo (mesma lógica do caminho normal)
          const nextFupIndexSim = conv.followUpCount + 1
          const nextFollowUpSim = followUps[nextFupIndexSim]

          if (nextFollowUpSim) {
            const nextFollowUpAtSim = new Date(now.getTime() + nextFollowUpSim.delayMinutes * 60 * 1000)
            await db.conversation.update({
              where: { id: conv.id },
              data: { followUpCount: nextFupIndexSim, nextFollowUpAt: nextFollowUpAtSim },
            })
          } else {
            await db.conversation.update({
              where: { id: conv.id },
              data: { nextFollowUpAt: null, followUpCount: 0 },
            })
          }

          await revalidateConversationCache(conv.id, conv.organizationId)
          processed++
          log('fup_sent', 'SENT', {
            followUpIndex: conv.followUpCount,
            followUpId: currentFollowUp.id,
            followUpOrder: currentFollowUp.order,
            mode: 'simulator',
          })
          continue
        }

        // 3. Resolver provider com tratamento de credenciais ausentes
        let provider
        try {
          provider = resolveWhatsAppProvider(conv.inbox)
        } catch (providerError) {
          log('provider_resolve', 'SKIP', {
            reason: 'provider_error',
            error: providerError instanceof Error ? providerError.message : String(providerError),
          })
          // Limpar estado e registrar evento visível ao usuário
          await db.conversation.update({
            where: { id: conv.id },
            data: { nextFollowUpAt: null, followUpCount: 0 },
          })
          await db.conversationEvent.create({
            data: {
              conversationId: conv.id,
              type: 'INFO',
              toolName: 'follow_up',
              content: 'Follow-ups pausados: conexão com WhatsApp indisponível.',
              visibleToUser: true,
              metadata: {
                subtype: 'FOLLOW_UP_PROVIDER_ERROR' satisfies InfoSubtype,
                error: providerError instanceof Error ? providerError.message : String(providerError),
              } as Prisma.InputJsonValue,
            },
          }).catch(() => {})
          skipped++
          continue
        }

        // 4. Enviar mensagem via provider correto (Evolution, Meta Cloud ou Z-API)
        log('fup_sending', 'SENT', {
          followUpIndex: conv.followUpCount,
          connectionType: conv.inbox.connectionType,
          textLength: currentFollowUp.messageContent.length,
        })
        const sentIds = await provider.sendText(conv.remoteJid, currentFollowUp.messageContent)

        // 5. Pré-registrar dedup keys para evitar que webhook reprocesse como msg humana
        // TTL 600s (10 min) para cobrir debounces e retentativas de webhook
        await Promise.all(
          sentIds.map((sentId) =>
            redis.set(`dedup:${sentId}`, '1', 'EX', 600).catch((redisError) => {
              logger.warn('[follow-up-cron] Dedup key set failed, webhook may reprocess message', {
                sentId,
                error: redisError instanceof Error ? redisError.message : String(redisError),
              })
            }),
          ),
        )

        // 6. Salvar como mensagem do assistant com metadata de rastreio
        await db.message.create({
          data: {
            conversationId: conv.id,
            role: 'assistant',
            content: currentFollowUp.messageContent,
            metadata: {
              source: 'follow_up',
              followUpId: currentFollowUp.id,
              followUpOrder: currentFollowUp.order,
            } as Prisma.InputJsonValue,
          },
        })

        // 7. Registrar ConversationEvent para rastreabilidade do FUP enviado
        await db.conversationEvent.create({
          data: {
            conversationId: conv.id,
            type: 'INFO',
            toolName: 'follow_up',
            content: `Follow-up #${conv.followUpCount + 1} enviado automaticamente`,
            visibleToUser: true,
            metadata: {
              subtype: 'FOLLOW_UP_SENT' satisfies InfoSubtype,
              followUpId: currentFollowUp.id,
              followUpOrder: currentFollowUp.order,
              delayMinutes: currentFollowUp.delayMinutes,
            } as Prisma.InputJsonValue,
          },
        })

        // 8. Agendar próximo FUP ou finalizar ciclo
        const nextFupIndex = conv.followUpCount + 1
        const nextFollowUp = followUps[nextFupIndex]

        if (nextFollowUp) {
          // Há mais follow-ups — agendar próximo com base no delay do próximo
          const nextFollowUpAt = new Date(now.getTime() + nextFollowUp.delayMinutes * 60 * 1000)
          await db.conversation.update({
            where: { id: conv.id },
            data: {
              followUpCount: nextFupIndex,
              nextFollowUpAt,
            },
          })
        } else {
          // Último follow-up enviado — limpar ciclo
          await db.conversation.update({
            where: { id: conv.id },
            data: {
              nextFollowUpAt: null,
              followUpCount: 0,
            },
          })
        }

        // 9. Revalidar cache via API interna
        await revalidateConversationCache(conv.id, conv.organizationId)

        processed++
        log('fup_sent', 'SENT', {
          followUpIndex: conv.followUpCount,
          followUpId: currentFollowUp.id,
          followUpOrder: currentFollowUp.order,
          sentIds,
        })
      } catch (error) {
        errors++
        log('conversation_failed', 'ERROR', {
          followUpCount: conv.followUpCount,
          error: error instanceof Error ? error.message : String(error),
        })
        // Limpar estado de FUP para evitar retry infinito a cada 3 minutos
        // Se o provider aceitou mas a resposta se perdeu, nextFollowUpAt ficaria no passado
        await db.conversation.update({
          where: { id: conv.id },
          data: { nextFollowUpAt: null, followUpCount: 0 },
        }).catch(() => {}) // Não falhar se a limpeza também falhar
      }
    }

    triggerMetadata.set('processed', processed)
    triggerMetadata.set('skipped', skipped)
    triggerMetadata.set('errors', errors)

    logger.info('[follow-up-cron] Done', { processed, skipped, errors, total: conversations.length })

    return { processed, skipped, errors, total: conversations.length }
  },
})

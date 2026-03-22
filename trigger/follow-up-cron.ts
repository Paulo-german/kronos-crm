import { schedules, logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { checkBusinessHours } from '@/_lib/agent/check-business-hours'
import type { ConnectionType, Prisma } from '@prisma/client'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'

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
  followUpBusinessHoursEnabled: boolean
  followUpBusinessHoursConfig: Prisma.JsonValue
  followUpBusinessHoursTimezone: string
}

interface ConvInbox {
  id: string
  isActive: boolean
  connectionType: ConnectionType
  evolutionInstanceName: string | null
  metaPhoneNumberId: string | null
  metaAccessToken: string | null
  zapiInstanceId: string | null
  zapiToken: string | null
  zapiClientToken: string | null
  agent: ConvInboxAgent | null
}

interface ConvFollowUpGroup {
  id: string
  isActive: boolean
  exhaustedAction: string
  exhaustedConfig: Prisma.JsonValue
  steps: Array<{
    id: string
    order: number
    delayMinutes: number
    messageContent: string
    followUpGroupId: string
    createdAt: Date
    updatedAt: Date
  }>
}

interface ConvForCron {
  id: string
  remoteJid: string | null
  organizationId: string
  dealId: string | null
  followUpCount: number
  currentFollowUpGroupId: string | null
  inbox: ConvInbox
  currentFollowUpGroup: ConvFollowUpGroup | null
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
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
    const weekday = parts.find((part) => part.type === 'weekday')?.value ?? ''

    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    }

    const dayIndex = weekdayMap[weekday] ?? 0
    const dayKey = DAY_KEYS[dayIndex]
    const dayConfig = config[dayKey]

    if (!dayConfig.enabled) continue

    const [startHour, startMin] = dayConfig.start.split(':').map(Number)
    const [endHour, endMin] = dayConfig.end.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    const currentMinutes = hour * 60 + minute

    // Se é hoje (daysAhead === 0): só usar se ainda está antes do fim do horário
    if (daysAhead === 0 && currentMinutes >= endMinutes) continue

    // Se é hoje e já está dentro do horário — não deveria chegar aqui (isFollowUpWithinBusinessHours
    // teria retornado true), mas por segurança retornar now para não adiar indevidamente
    if (daysAhead === 0 && currentMinutes >= startMinutes) return now

    // Obter o offset UTC do timezone para o dia candidato via Intl shortOffset
    const tzOffsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
    const tzParts = tzOffsetFormatter.formatToParts(candidateUtc)
    const tzName = tzParts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0'

    // Extrair offset numérico (em minutos) a partir de "GMT±H" ou "GMT±HH:MM"
    const offsetMatch = tzName.match(/GMT([+-]\d{1,2}(?::\d{2})?)/)
    let offsetTotalMinutes = 0

    if (offsetMatch) {
      const offsetStr = offsetMatch[1]
      // Parsing robusto: detectar sinal separadamente para evitar bug em GMT+0
      const isNegative = offsetStr.startsWith('-')
      const cleanStr = offsetStr.replace(/^[+-]/, '')
      const parts = cleanStr.split(':')
      const hours = parseInt(parts[0], 10)
      const minutes = parts[1] ? parseInt(parts[1], 10) : 0
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

// Revalidar cache da conversa via API interna (nao usar revalidateTag — roda fora do Next.js)
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

// Tipos auxiliares para a config de esgotamento (espelho de ExhaustedConfig do data-access)
interface ExhaustedConfig {
  targetStageId?: string
  notifyTarget?: 'deal_assignee' | 'specific_number'
  specificPhone?: string
}

// Executar acao configurada quando todos os FUPs de um grupo sao esgotados
async function executeExhaustedAction(conv: ConvForCron, now: Date): Promise<void> {
  if (!conv.currentFollowUpGroup) return

  const { exhaustedAction, exhaustedConfig } = conv.currentFollowUpGroup
  const config = exhaustedConfig as ExhaustedConfig | null

  if (exhaustedAction === 'NONE') return

  if (exhaustedAction === 'NOTIFY_HUMAN') {
    // Pausar a IA para que um humano assuma a conversa
    await db.conversation.update({
      where: { id: conv.id },
      data: { aiPaused: true, pausedAt: now },
    })

    // Registrar evento visivel ao usuario
    await db.conversationEvent.create({
      data: {
        conversationId: conv.id,
        type: 'INFO',
        toolName: 'follow_up',
        content: 'Follow-up esgotado. Conversa transferida para atendimento humano.',
        visibleToUser: true,
        metadata: {
          subtype: 'FOLLOW_UP_EXHAUSTED_NOTIFY',
          followUpGroupId: conv.currentFollowUpGroupId,
          notifyTarget: config?.notifyTarget ?? 'deal_assignee',
          specificPhone: config?.specificPhone ?? null,
        } as Prisma.InputJsonValue,
      },
    })

    logger.info(`[follow-up-cron] NOTIFY_HUMAN executed for conversation ${conv.id}`)
    return
  }

  if (exhaustedAction === 'MOVE_DEAL_STAGE') {
    const targetStageId = config?.targetStageId

    // Sem deal ou sem stage de destino configurado — ignorar silenciosamente
    if (!conv.dealId || !targetStageId) {
      logger.warn(`[follow-up-cron] MOVE_DEAL_STAGE skipped for conversation ${conv.id}: dealId=${conv.dealId}, targetStageId=${targetStageId}`)
      return
    }

    // Mover o deal para o stage de destino
    await db.deal.update({
      where: { id: conv.dealId },
      data: { pipelineStageId: targetStageId },
    })

    // Registrar evento visivel ao usuario
    await db.conversationEvent.create({
      data: {
        conversationId: conv.id,
        type: 'INFO',
        toolName: 'follow_up',
        content: 'Follow-up esgotado. Negócio movido para nova etapa automaticamente.',
        visibleToUser: true,
        metadata: {
          subtype: 'FOLLOW_UP_EXHAUSTED_MOVE_DEAL',
          followUpGroupId: conv.currentFollowUpGroupId,
          dealId: conv.dealId,
          targetStageId,
        } as Prisma.InputJsonValue,
      },
    })

    logger.info(`[follow-up-cron] MOVE_DEAL_STAGE executed for conversation ${conv.id}, dealId=${conv.dealId}, targetStageId=${targetStageId}`)
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
    // O indice @@index([nextFollowUpAt, aiPaused]) garante performance
    const conversations = await db.conversation.findMany({
      where: {
        nextFollowUpAt: { lte: now },
        aiPaused: false,
      },
      select: {
        id: true,
        remoteJid: true,
        organizationId: true,
        dealId: true,
        followUpCount: true,
        currentFollowUpGroupId: true,
        inbox: {
          select: {
            id: true,
            isActive: true,
            connectionType: true,
            evolutionInstanceName: true,
            metaPhoneNumberId: true,
            metaAccessToken: true,
            zapiInstanceId: true,
            zapiToken: true,
            zapiClientToken: true,
            agent: {
              select: {
                followUpBusinessHoursEnabled: true,
                followUpBusinessHoursConfig: true,
                followUpBusinessHoursTimezone: true,
              },
            },
          },
        },
        currentFollowUpGroup: {
          select: {
            id: true,
            isActive: true,
            exhaustedAction: true,
            exhaustedConfig: true,
            steps: { orderBy: { order: 'asc' } },
          },
        },
      },
      take: BATCH_SIZE,
      orderBy: { nextFollowUpAt: 'asc' }, // Processar mais antigos primeiro
    })

    if (conversations.length === 0) {
      return { processed: 0, skipped: 0, errors: 0, total: 0 }
    }

    logger.info(`[follow-up-cron] Processing ${conversations.length} conversations`)

    let processed = 0
    let skipped = 0
    let errors = 0

    for (const conv of conversations) {
      try {
        // Validar: grupo existe e esta ativo
        if (!conv.currentFollowUpGroup || !conv.currentFollowUpGroup.isActive) {
          // Grupo foi desativado ou deletado — limpar campos de FUP
          await db.conversation.update({
            where: { id: conv.id },
            data: { nextFollowUpAt: null, followUpCount: 0, currentFollowUpGroupId: null },
          })
          skipped++
          continue
        }

        // Validar: inbox ativa e remoteJid disponivel
        if (!conv.inbox.isActive || !conv.remoteJid) {
          // Limpar estado completo — inbox inativa nao pode processar FUPs
          await db.conversation.update({
            where: { id: conv.id },
            data: { nextFollowUpAt: null, followUpCount: 0, currentFollowUpGroupId: null },
          })
          skipped++
          continue
        }

        const groupSteps = conv.currentFollowUpGroup.steps
        // followUpCount e usado como indice de array (0-based), nao como valor de order
        const currentFupStep = groupSteps[conv.followUpCount]

        if (!currentFupStep) {
          // Todos os FUPs esgotados — executar acao configurada antes de limpar
          await executeExhaustedAction(conv, now)

          // Limpar estado de FUP (independente da acao executada)
          await db.conversation.update({
            where: { id: conv.id },
            data: { nextFollowUpAt: null, followUpCount: 0, currentFollowUpGroupId: null },
          })
          skipped++
          continue
        }

        // Race condition check: re-verificar estado atual antes de enviar
        // O cliente pode ter respondido entre a leitura do batch e este ponto
        const freshConv = await db.conversation.findUnique({
          where: { id: conv.id },
          select: { nextFollowUpAt: true, aiPaused: true, followUpCount: true, currentFollowUpGroupId: true },
        })

        const hasFupChanged =
          !freshConv ||
          !freshConv.nextFollowUpAt ||
          freshConv.aiPaused ||
          freshConv.currentFollowUpGroupId !== conv.currentFollowUpGroupId ||
          freshConv.followUpCount !== conv.followUpCount

        if (hasFupChanged) {
          logger.info(`[follow-up-cron] Conversation ${conv.id} state changed since batch read, skipping`)
          skipped++
          continue
        }

        // Race condition check: verificar se o grupo ainda existe e está ativo
        // O grupo pode ter sido deletado/desativado entre a leitura do batch e este ponto
        if (conv.currentFollowUpGroupId) {
          const freshGroup = await db.followUpGroup.findUnique({
            where: { id: conv.currentFollowUpGroupId },
            select: { isActive: true },
          })

          if (!freshGroup || !freshGroup.isActive) {
            await db.conversation.update({
              where: { id: conv.id },
              data: { nextFollowUpAt: null, followUpCount: 0, currentFollowUpGroupId: null },
            })
            logger.info(`[follow-up-cron] Follow-up group ${conv.currentFollowUpGroupId} no longer active for conversation ${conv.id}, clearing FUP state`)
            skipped++
            continue
          }
        }

        // Business hours check para follow-up (config separada da do agente)
        // Se habilitado e o momento atual estiver fora do horário, adiar para próxima abertura
        const agent = conv.inbox.agent
        if (agent?.followUpBusinessHoursEnabled && agent.followUpBusinessHoursConfig) {
          // Validar que o config é um objeto válido antes de fazer cast — JSON pode ser malformado
          if (
            typeof agent.followUpBusinessHoursConfig !== 'object' ||
            agent.followUpBusinessHoursConfig === null ||
            Array.isArray(agent.followUpBusinessHoursConfig)
          ) {
            logger.warn(`[follow-up-cron] Invalid FUP business hours config for conversation ${conv.id}, skipping check`)
          } else {
            const bhConfig = agent.followUpBusinessHoursConfig as BusinessHoursConfig
            const timezone = agent.followUpBusinessHoursTimezone

            // Reutiliza checkBusinessHours do helper do agente (elimina duplicação)
            const isOpen = checkBusinessHours(timezone, bhConfig)

            if (!isOpen) {
              // Calcular próximo momento de abertura e reagendar o FUP
              const nextOpeningTime = getNextFollowUpOpeningTime(timezone, bhConfig)

              await db.conversation.update({
                where: { id: conv.id },
                data: { nextFollowUpAt: nextOpeningTime },
              })

              logger.info(`[follow-up-cron] FUP deferred to next business hours opening for conversation ${conv.id}`, {
                timezone,
                nextOpeningTime: nextOpeningTime.toISOString(),
              })

              skipped++
              continue
            }
          }
        }

        // 2. Resolver provider com tratamento de credenciais ausentes
        let provider
        try {
          provider = resolveWhatsAppProvider(conv.inbox)
        } catch (providerError) {
          logger.warn(`[follow-up-cron] Provider resolution failed for conversation ${conv.id}, clearing FUP state`, {
            error: providerError instanceof Error ? providerError.message : String(providerError),
          })
          // Limpar estado e registrar evento visível ao usuário
          await db.conversation.update({
            where: { id: conv.id },
            data: { nextFollowUpAt: null, followUpCount: 0, currentFollowUpGroupId: null },
          })
          await db.conversationEvent.create({
            data: {
              conversationId: conv.id,
              type: 'INFO',
              toolName: 'follow_up',
              content: 'Follow-ups pausados: conexão com WhatsApp indisponível.',
              visibleToUser: true,
              metadata: {
                subtype: 'FOLLOW_UP_PROVIDER_ERROR',
                error: providerError instanceof Error ? providerError.message : String(providerError),
              } as Prisma.InputJsonValue,
            },
          }).catch(() => {})
          skipped++
          continue
        }

        // 3. Enviar mensagem via provider correto (Evolution ou Meta Cloud)
        const sentIds = await provider.sendText(conv.remoteJid, currentFupStep.messageContent)

        // 4. Pre-registrar dedup keys para evitar que webhook reprocesse como msg humana
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

        // 5. Salvar como mensagem do assistant com metadata de rastreio
        await db.message.create({
          data: {
            conversationId: conv.id,
            role: 'assistant',
            content: currentFupStep.messageContent,
            metadata: {
              source: 'follow_up',
              followUpGroupId: conv.currentFollowUpGroupId,
              followUpStepOrder: currentFupStep.order,
            } as Prisma.InputJsonValue,
          },
        })

        // 5b. Registrar ConversationEvent para rastreabilidade do FUP enviado
        await db.conversationEvent.create({
          data: {
            conversationId: conv.id,
            type: 'INFO',
            toolName: 'follow_up',
            content: `Follow-up #${conv.followUpCount + 1} enviado automaticamente`,
            visibleToUser: true,
            metadata: {
              subtype: 'FOLLOW_UP_SENT',
              followUpGroupId: conv.currentFollowUpGroupId,
              followUpStepOrder: currentFupStep.order,
              delayMinutes: currentFupStep.delayMinutes,
            } as Prisma.InputJsonValue,
          },
        })

        // 6. Agendar proximo FUP ou finalizar ciclo
        const nextFupIndex = conv.followUpCount + 1
        const nextFupStep = groupSteps[nextFupIndex]

        if (nextFupStep) {
          // Ha mais steps — agendar proximo com base no delay do proximo step
          const nextFollowUpAt = new Date(now.getTime() + nextFupStep.delayMinutes * 60 * 1000)
          await db.conversation.update({
            where: { id: conv.id },
            data: {
              followUpCount: nextFupIndex,
              nextFollowUpAt,
            },
          })
        } else {
          // Ultimo step enviado — limpar ciclo
          await db.conversation.update({
            where: { id: conv.id },
            data: {
              nextFollowUpAt: null,
              followUpCount: 0,
              currentFollowUpGroupId: null,
            },
          })
        }

        // 7. Revalidar cache via API interna
        await revalidateConversationCache(conv.id, conv.organizationId)

        processed++
        logger.info(`[follow-up-cron] Sent FUP #${conv.followUpCount + 1} to conversation ${conv.id}`, {
          groupId: conv.currentFollowUpGroupId,
          stepOrder: currentFupStep.order,
        })
      } catch (error) {
        errors++
        logger.error(`[follow-up-cron] Failed for conversation ${conv.id}`, {
          error: error instanceof Error ? error.message : String(error),
        })
        // Limpar estado de FUP para evitar retry infinito a cada 3 minutos
        // Se o provider aceitou mas a resposta se perdeu, nextFollowUpAt ficaria no passado
        await db.conversation.update({
          where: { id: conv.id },
          data: { nextFollowUpAt: null, followUpCount: 0, currentFollowUpGroupId: null },
        }).catch(() => {}) // Nao falhar se a limpeza tambem falhar
      }
    }

    logger.info(`[follow-up-cron] Done`, { processed, skipped, errors, total: conversations.length })

    return { processed, skipped, errors, total: conversations.length }
  },
})

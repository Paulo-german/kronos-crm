import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { checkBusinessHours } from '@/_lib/agent/check-business-hours'
import { getFollowUpsForStep } from '@/_data-access/follow-up/get-follow-ups-for-step'
import type { ConnectionType, InboxChannel, Prisma } from '@prisma/client'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'
import type { InfoSubtype } from '@/_lib/conversation-events/types'

export const maxDuration = 300

const BATCH_SIZE = 50

const DAY_KEYS: (keyof BusinessHoursConfig)[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

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
  channel: InboxChannel
  evolutionInstanceName: string | null
  evolutionApiUrl: string | null
  evolutionApiKey: string | null
  metaPhoneNumberId: string | null
  metaAccessToken: string | null
  metaIgUserId: string | null
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
  activeAgentId: string | null
  inbox: ConvInbox
}

interface ExhaustedConfig {
  targetStageId?: string
  notifyTarget?: 'deal_assignee' | 'specific_number'
  specificPhone?: string
}

function getNextFollowUpOpeningTime(timezone: string, config: BusinessHoursConfig): Date {
  const now = new Date()
  const MAX_DAYS_AHEAD = 8

  for (let daysAhead = 0; daysAhead < MAX_DAYS_AHEAD; daysAhead++) {
    const candidateUtc = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hour12: false,
    })

    const parts = formatter.formatToParts(candidateUtc)
    const weekdayStr = parts.find((part) => part.type === 'weekday')?.value ?? ''

    const WEEKDAY_MAP: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    }
    const dayIndex = WEEKDAY_MAP[weekdayStr]
    if (dayIndex === undefined) continue

    const dayKey = DAY_KEYS[dayIndex]
    const dayConfig = config[dayKey]

    if (!dayConfig || !dayConfig.enabled) continue

    const [startHour, startMin] = dayConfig.start.split(':').map(Number)

    const offsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
    const offsetParts = offsetFormatter.formatToParts(candidateUtc)
    const tzName = offsetParts.find((part) => part.type === 'timeZoneName')?.value ?? ''

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

    const candidateLocalFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const candidateLocalDate = candidateLocalFormatter.format(candidateUtc)
    const [monthStr, dayStr, yearStr] = candidateLocalDate.split('/')

    const targetYear = parseInt(yearStr, 10)
    const targetMonth = parseInt(monthStr, 10) - 1
    const targetDay = parseInt(dayStr, 10)

    const utcMs =
      Date.UTC(targetYear, targetMonth, targetDay, startHour, startMin, 0) -
      offsetTotalMinutes * 60 * 1000

    const result = new Date(utcMs)

    if (result > now) return result
  }

  console.warn('[follow-up-cron] No business hours enabled in next 7 days, deferring 24h', {
    timezone,
    enabledDays: Object.entries(config).filter(([, day]) => day.enabled).map(([key]) => key),
  })
  return new Date(now.getTime() + 24 * 60 * 60 * 1000)
}

async function executeExhaustedAction(
  conv: ConvForCron,
  now: Date,
  agent: ConvInboxAgent,
): Promise<void> {
  const exhaustedAction = agent.followUpExhaustedAction
  const config = agent.followUpExhaustedConfig as ExhaustedConfig | null

  if (exhaustedAction === 'NONE') return

  if (exhaustedAction === 'NOTIFY_HUMAN') {
    await db.conversation.update({
      where: { id: conv.id },
      data: { aiPaused: true, pausedAt: now },
    })

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

export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const startedAt = Date.now()

  const conversations = await db.conversation.findMany({
    where: {
      nextFollowUpAt: { lte: now },
      aiPaused: false,
      OR: [
        { inbox: { agentId: { not: null }, agent: { isActive: true, agentVersion: 'single-v2' } } },
      ],
    },
    select: {
      id: true,
      remoteJid: true,
      organizationId: true,
      dealId: true,
      followUpCount: true,
      currentStepOrder: true,
      activeAgentId: true,
      inbox: {
        select: {
          id: true,
          isActive: true,
          connectionType: true,
          channel: true,
          evolutionInstanceName: true,
          evolutionApiUrl: true,
          evolutionApiKey: true,
          metaPhoneNumberId: true,
          metaAccessToken: true,
          metaIgUserId: true,
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
    orderBy: { nextFollowUpAt: 'asc' },
  })

  if (conversations.length === 0) {
    return NextResponse.json({ processed: 0, skipped: 0, errors: 0, total: 0, durationMs: Date.now() - startedAt })
  }

  console.info('[follow-up-cron] Processing batch', { batchSize: conversations.length })

  let processed = 0
  let skipped = 0
  let errors = 0

  for (const conv of conversations) {
    const log = (
      step: string,
      outcome: 'SENT' | 'SKIP' | 'ERROR',
      extra?: Record<string, unknown>,
    ) => console.info(`[fup] ${step} → ${outcome}`, { convId: conv.id, organizationId: conv.organizationId, ...extra })

    try {
      if (!conv.inbox.isActive || !conv.remoteJid) {
        await db.conversation.update({
          where: { id: conv.id },
          data: { nextFollowUpAt: null, followUpCount: 0 },
        })
        log('conversation_check', 'SKIP', { reason: !conv.inbox.isActive ? 'inbox_inactive' : 'no_remote_jid' })
        skipped++
        continue
      }

      const agentId = conv.inbox.agentId ?? conv.activeAgentId
      if (!agentId) {
        log('agent_resolve', 'SKIP', { reason: 'no_active_agent_not_yet_routed' })
        skipped++
        continue
      }

      let resolvedAgent = conv.inbox.agent

      if (!resolvedAgent && conv.activeAgentId) {
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
        await db.conversation.update({
          where: { id: conv.id },
          data: { nextFollowUpAt: null, followUpCount: 0 },
        })
        log('agent_resolve', 'SKIP', { reason: 'agent_deleted' })
        skipped++
        continue
      }

      const followUps = await getFollowUpsForStep(agentId, conv.currentStepOrder)

      if (followUps.length === 0) {
        await db.conversation.update({
          where: { id: conv.id },
          data: { nextFollowUpAt: null, followUpCount: 0 },
        })
        log('followup_lookup', 'SKIP', { reason: 'no_follow_ups_for_step', stepOrder: conv.currentStepOrder })
        skipped++
        continue
      }

      const currentFollowUp = followUps[conv.followUpCount]

      if (!currentFollowUp) {
        await executeExhaustedAction(conv, now, resolvedAgent)

        await db.conversation.update({
          where: { id: conv.id },
          data: { nextFollowUpAt: null, followUpCount: 0 },
        })
        log('followup_lookup', 'SKIP', { reason: 'all_exhausted', followUpCount: conv.followUpCount })
        skipped++
        continue
      }

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

      if (resolvedAgent.followUpBusinessHoursEnabled && resolvedAgent.followUpBusinessHoursConfig) {
        const bhConfigRaw = resolvedAgent.followUpBusinessHoursConfig
        const isValidBhConfig =
          typeof bhConfigRaw === 'object' && bhConfigRaw !== null && !Array.isArray(bhConfigRaw)

        if (!isValidBhConfig) {
          console.warn('[follow-up-cron] Invalid FUP business hours config', { convId: conv.id })
        }

        if (isValidBhConfig) {
          const bhConfig = bhConfigRaw as BusinessHoursConfig
          const timezone = resolvedAgent.followUpBusinessHoursTimezone
          const isOpen = checkBusinessHours(timezone, bhConfig)

          if (!isOpen) {
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

      if (conv.inbox.connectionType === 'SIMULATOR') {
        log('fup_sending', 'SENT', {
          followUpIndex: conv.followUpCount,
          connectionType: 'SIMULATOR',
          textLength: currentFollowUp.messageContent.length,
        })

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

        const nextFupIndexSim = conv.followUpCount + 1
        const nextFollowUpSim = followUps[nextFupIndexSim]

        await db.conversation.update({
          where: { id: conv.id },
          data: nextFollowUpSim
            ? { followUpCount: nextFupIndexSim, nextFollowUpAt: new Date(now.getTime() + nextFollowUpSim.delayMinutes * 60 * 1000) }
            : { nextFollowUpAt: null, followUpCount: 0 },
        })

        revalidateTag(`conversation-messages:${conv.id}`)
        processed++
        log('fup_sent', 'SENT', {
          followUpIndex: conv.followUpCount,
          followUpId: currentFollowUp.id,
          followUpOrder: currentFollowUp.order,
          mode: 'simulator',
        })
        continue
      }

      let provider
      try {
        provider = resolveWhatsAppProvider(conv.inbox)
      } catch (providerError) {
        log('provider_resolve', 'SKIP', {
          reason: 'provider_error',
          error: providerError instanceof Error ? providerError.message : String(providerError),
        })
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

      log('fup_sending', 'SENT', {
        followUpIndex: conv.followUpCount,
        connectionType: conv.inbox.connectionType,
        textLength: currentFollowUp.messageContent.length,
      })
      const sentIds = await provider.sendText(conv.remoteJid, currentFollowUp.messageContent)

      await Promise.all(
        sentIds.map((sentId) =>
          redis.set(`dedup:${sentId}`, '1', 'EX', 600).catch((redisError) => {
            console.warn('[follow-up-cron] Dedup key set failed, webhook may reprocess message', {
              sentId,
              error: redisError instanceof Error ? redisError.message : String(redisError),
            })
          }),
        ),
      )

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

      const nextFupIndex = conv.followUpCount + 1
      const nextFollowUp = followUps[nextFupIndex]

      await db.conversation.update({
        where: { id: conv.id },
        data: nextFollowUp
          ? { followUpCount: nextFupIndex, nextFollowUpAt: new Date(now.getTime() + nextFollowUp.delayMinutes * 60 * 1000) }
          : { nextFollowUpAt: null, followUpCount: 0 },
      })

      revalidateTag(`conversation-messages:${conv.id}`)

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
      await db.conversation.update({
        where: { id: conv.id },
        data: { nextFollowUpAt: null, followUpCount: 0 },
      }).catch(() => {})
    }
  }

  const result = { processed, skipped, errors, total: conversations.length, durationMs: Date.now() - startedAt }

  console.info('[follow-up-cron] Done', result)

  return NextResponse.json(result)
}

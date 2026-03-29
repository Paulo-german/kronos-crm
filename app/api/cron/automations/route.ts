import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { getStaleDeals } from '@/_data-access/automation/get-stale-deals'
import { getActiveAutomationsByTrigger } from '@/_data-access/automation/get-active-automations-by-trigger'
import { evaluateConditions } from '@/_lib/automations/evaluate-conditions'
import { getExecutor } from '@/_lib/automations/executors'
import { automationConditionSchema } from '@/_actions/automation/create-automation/schema'
import type { DealForEvaluation, DealStaleConfig, DealIdleInStageConfig } from '@/_lib/automations/types'
import type { AutomationTrigger, Prisma, DealPriority, DealStatus } from '@prisma/client'
import { z } from 'zod'

export const maxDuration = 300

const BATCH_SIZE = 50
const DEDUP_WINDOW_MS = 60 * 60 * 1000

// ─────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────

interface OrgWithTemporalAutomations {
  organizationId: string
}

// ─────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se já existe execução SUCCESS para o par automationId + dealId
 * na janela de deduplicação. Previne re-execução entre ticks do cron.
 */
async function isDuplicateExecution(automationId: string, dealId: string): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MS)
  const existing = await db.automationExecution.findFirst({
    where: {
      automationId,
      dealId,
      status: 'SUCCESS',
      executedAt: { gt: since },
    },
    select: { id: true },
  })
  return existing !== null
}

/**
 * Executa uma automação temporal contra um deal específico.
 * Registra AutomationExecution e atualiza contadores.
 */
async function runAutomationForDeal(
  automation: {
    id: string
    name: string
    orgId: string
    actionType: Parameters<typeof getExecutor>[0]
    actionConfig: Record<string, unknown>
    conditions: z.infer<typeof automationConditionSchema>[]
  },
  deal: DealForEvaluation,
  triggerPayload: Record<string, unknown>,
): Promise<'executed' | 'skipped' | 'duplicate' | 'failed'> {
  const conditionsMet = evaluateConditions(deal, automation.conditions)
  if (!conditionsMet) {
    await db.automationExecution.create({
      data: {
        automationId: automation.id,
        organizationId: automation.orgId,
        dealId: deal.id,
        status: 'SKIPPED',
        triggerPayload: triggerPayload as Prisma.InputJsonValue,
        actionResult: { reason: 'conditions_not_met' } as Prisma.InputJsonValue,
      },
    })
    return 'skipped'
  }

  const duplicate = await isDuplicateExecution(automation.id, deal.id)
  if (duplicate) return 'duplicate'

  const startedAt = Date.now()

  try {
    const executor = getExecutor(automation.actionType)
    const result = await executor({
      orgId: automation.orgId,
      automationId: automation.id,
      automationName: automation.name,
      deal,
      actionConfig: automation.actionConfig,
    })

    await db.automationExecution.create({
      data: {
        automationId: automation.id,
        organizationId: automation.orgId,
        dealId: deal.id,
        status: 'SUCCESS',
        triggerPayload: triggerPayload as Prisma.InputJsonValue,
        actionResult: result.summary as Prisma.InputJsonValue,
        durationMs: Date.now() - startedAt,
      },
    })

    await db.automation.update({
      where: { id: automation.id },
      data: {
        executionCount: { increment: 1 },
        lastTriggeredAt: new Date(),
      },
    })

    // Cache nativo do Next.js — funciona normalmente dentro do runtime Vercel Cron
    revalidateTag(`automation:${automation.id}`)
    revalidateTag(`automations:${automation.orgId}`)

    return 'executed'
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    await db.automationExecution.create({
      data: {
        automationId: automation.id,
        organizationId: automation.orgId,
        dealId: deal.id,
        status: 'FAILED',
        triggerPayload: triggerPayload as Prisma.InputJsonValue,
        errorMessage,
        durationMs: Date.now() - startedAt,
      },
    }).catch(() => {})

    return 'failed'
  }
}

/**
 * Constrói o snapshot DealForEvaluation a partir de um StaleDealDto.
 * Necessita buscar pipelineId via stage, pois StaleDealDto não o inclui.
 */
async function buildDealSnapshot(
  dealId: string,
  staleData: {
    id: string
    title: string
    stageId: string
    assignedTo: string
    priority: DealPriority
    updatedAt: Date
  },
): Promise<DealForEvaluation | null> {
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    select: {
      status: true,
      value: true,
      stage: { select: { pipelineId: true } },
    },
  })

  if (!deal) return null

  return {
    id: staleData.id,
    title: staleData.title,
    stageId: staleData.stageId,
    pipelineId: deal.stage.pipelineId,
    assignedTo: staleData.assignedTo,
    priority: staleData.priority,
    status: deal.status as DealStatus,
    value: deal.value !== null ? Number(deal.value) : null,
  }
}

// ─────────────────────────────────────────────────────────────
// Processamento por org
// ─────────────────────────────────────────────────────────────

/**
 * Processa todas as automações temporais de uma organização.
 * Para cada automação: busca deals stale, avalia conditions e executa.
 */
async function processOrgAutomations(orgId: string): Promise<{
  executed: number
  skipped: number
  errors: number
}> {
  const stats = { executed: 0, skipped: 0, errors: 0 }

  const [staleAutomations, idleInStageAutomations] = await Promise.all([
    getActiveAutomationsByTrigger(orgId, 'DEAL_STALE' as AutomationTrigger),
    getActiveAutomationsByTrigger(orgId, 'DEAL_IDLE_IN_STAGE' as AutomationTrigger),
  ])

  // ── Processa DEAL_STALE ───────────────────────────────────
  for (const automation of staleAutomations) {
    try {
      const conditionsParse = z.array(automationConditionSchema).safeParse(automation.conditions)
      if (!conditionsParse.success) {
        console.error(`[automation-cron] Conditions inválidas para automação ${automation.id}`, {
          error: conditionsParse.error.flatten(),
        })
        stats.errors++
        continue
      }

      const config = automation.triggerConfig as unknown as DealStaleConfig

      const staleDeals = await getStaleDeals({
        orgId,
        thresholdMinutes: config.thresholdMinutes,
        pipelineId: config.pipelineId,
      })

      for (const staleData of staleDeals) {
        try {
          const deal = await buildDealSnapshot(staleData.id, staleData)
          if (!deal) continue

          const outcome = await runAutomationForDeal(
            {
              id: automation.id,
              name: automation.name,
              orgId,
              actionType: automation.actionType,
              actionConfig: automation.actionConfig,
              conditions: conditionsParse.data,
            },
            deal,
            {
              triggerType: 'DEAL_STALE',
              thresholdMinutes: config.thresholdMinutes,
              dealId: deal.id,
            },
          )

          if (outcome === 'executed') stats.executed++
          else if (outcome === 'failed') stats.errors++
          else stats.skipped++
        } catch (dealError) {
          stats.errors++
          console.error(`[automation-cron] Erro ao processar deal ${staleData.id}`, {
            error: dealError instanceof Error ? dealError.message : String(dealError),
          })
        }
      }
    } catch (automationError) {
      stats.errors++
      console.error(`[automation-cron] Erro ao processar automação DEAL_STALE ${automation.id}`, {
        error: automationError instanceof Error ? automationError.message : String(automationError),
      })
    }
  }

  // ── Processa DEAL_IDLE_IN_STAGE ───────────────────────────
  for (const automation of idleInStageAutomations) {
    try {
      const conditionsParse = z.array(automationConditionSchema).safeParse(automation.conditions)
      if (!conditionsParse.success) {
        console.error(`[automation-cron] Conditions inválidas para automação ${automation.id}`, {
          error: conditionsParse.error.flatten(),
        })
        stats.errors++
        continue
      }

      const config = automation.triggerConfig as unknown as DealIdleInStageConfig

      // Para DEAL_IDLE_IN_STAGE, restringimos por stageId específico
      const idleDeals = await getStaleDeals({
        orgId,
        thresholdMinutes: config.thresholdMinutes,
        stageId: config.stageId,
      })

      for (const staleData of idleDeals) {
        try {
          const deal = await buildDealSnapshot(staleData.id, staleData)
          if (!deal) continue

          const outcome = await runAutomationForDeal(
            {
              id: automation.id,
              name: automation.name,
              orgId,
              actionType: automation.actionType,
              actionConfig: automation.actionConfig,
              conditions: conditionsParse.data,
            },
            deal,
            {
              triggerType: 'DEAL_IDLE_IN_STAGE',
              stageId: config.stageId,
              thresholdMinutes: config.thresholdMinutes,
              dealId: deal.id,
            },
          )

          if (outcome === 'executed') stats.executed++
          else if (outcome === 'failed') stats.errors++
          else stats.skipped++
        } catch (dealError) {
          stats.errors++
          console.error(`[automation-cron] Erro ao processar deal ${staleData.id}`, {
            error: dealError instanceof Error ? dealError.message : String(dealError),
          })
        }
      }
    } catch (automationError) {
      stats.errors++
      console.error(
        `[automation-cron] Erro ao processar automação DEAL_IDLE_IN_STAGE ${automation.id}`,
        {
          error:
            automationError instanceof Error ? automationError.message : String(automationError),
        },
      )
    }
  }

  return stats
}

// ─────────────────────────────────────────────────────────────
// Handler principal
// ─────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  // Vercel injeta o header Authorization com CRON_SECRET automaticamente
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()

  const orgsRaw = await db.automation.groupBy({
    by: ['organizationId'],
    where: {
      isActive: true,
      triggerType: { in: ['DEAL_STALE', 'DEAL_IDLE_IN_STAGE'] },
    },
    orderBy: { organizationId: 'asc' },
    take: BATCH_SIZE,
  })
  const orgsWithTemporalAutomations: OrgWithTemporalAutomations[] = orgsRaw

  if (orgsWithTemporalAutomations.length === 0) {
    return NextResponse.json({ orgs: 0, executed: 0, skipped: 0, errors: 0, durationMs: Date.now() - startedAt })
  }

  console.info(
    `[automation-cron] Processando ${orgsWithTemporalAutomations.length} organizações com automações temporais`,
  )

  let totalExecuted = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (const org of orgsWithTemporalAutomations) {
    try {
      const stats = await processOrgAutomations(org.organizationId)
      totalExecuted += stats.executed
      totalSkipped += stats.skipped
      totalErrors += stats.errors
    } catch (orgError) {
      totalErrors++
      console.error(`[automation-cron] Falha ao processar org ${org.organizationId}`, {
        error: orgError instanceof Error ? orgError.message : String(orgError),
      })
    }
  }

  const result = {
    orgs: orgsWithTemporalAutomations.length,
    executed: totalExecuted,
    skipped: totalSkipped,
    errors: totalErrors,
    durationMs: Date.now() - startedAt,
  }

  console.info('[automation-cron] Ciclo concluído', result)

  return NextResponse.json(result)
}

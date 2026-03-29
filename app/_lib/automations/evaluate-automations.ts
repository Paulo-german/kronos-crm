import 'server-only'
import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { getActiveAutomationsByTrigger } from '@/_data-access/automation/get-active-automations-by-trigger'
import { evaluateConditions } from './evaluate-conditions'
import { getExecutor } from './executors'
import { automationConditionSchema } from '@/_actions/automation/create-automation/schema'
import type { AutomationEvent, DealForEvaluation } from './types'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

// Janela de deduplicação padrão: 60 minutos
const DEFAULT_DEDUP_WINDOW_MS = 60 * 60 * 1000

// ─────────────────────────────────────────────────────────────
// Resolução lazy do deal
// ─────────────────────────────────────────────────────────────

/**
 * Busca o deal completo do banco para avaliação de condições.
 * Feito de forma lazy pelo orquestrador para não adicionar queries extras
 * nas actions que disparam o evento.
 */
async function fetchDealForEvaluation(dealId: string): Promise<DealForEvaluation | null> {
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      title: true,
      pipelineStageId: true,
      assignedTo: true,
      priority: true,
      status: true,
      value: true,
      stage: {
        select: { pipelineId: true },
      },
    },
  })

  if (!deal) return null

  return {
    id: deal.id,
    title: deal.title,
    stageId: deal.pipelineStageId,
    pipelineId: deal.stage.pipelineId,
    assignedTo: deal.assignedTo,
    priority: deal.priority,
    status: deal.status,
    // Decimal → number (null-safe); null se o deal não tem valor definido (0 é válido)
    value: deal.value !== null ? Number(deal.value) : null,
  }
}

// ─────────────────────────────────────────────────────────────
// Verificação de deduplicação
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se já existe uma execução recente para o mesmo par automationId + dealId.
 * Previne dupla execução entre event-hooks e cron ticks.
 */
async function isDuplicate(
  automationId: string,
  dealId: string,
  windowMs: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs)
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

// ─────────────────────────────────────────────────────────────
// Orquestrador principal
// ─────────────────────────────────────────────────────────────

/**
 * Avalia todas as automações ativas para um evento e executa as actions cabíveis.
 *
 * Fluxo por automação:
 * 1. Parse e validação das conditions (JSON do banco)
 * 2. Avaliação das conditions contra o deal atual
 * 3. Verificação de dedup (60min window por padrão)
 * 4. Execução da action via registry
 * 5. Registro do AutomationExecution (SUCCESS/FAILED/SKIPPED)
 * 6. Incremento de executionCount e atualização de lastTriggeredAt
 *
 * Fire-and-forget: erros são logados mas nunca propagados ao caller.
 */
export async function evaluateAutomations(event: AutomationEvent): Promise<void> {
  const automations = await getActiveAutomationsByTrigger(event.orgId, event.triggerType)

  if (automations.length === 0) return

  const deal = await fetchDealForEvaluation(event.dealId)
  if (!deal) {
    console.error(
      `[automation-engine] Deal ${event.dealId} não encontrado para o evento ${event.triggerType}`,
    )
    return
  }

  for (const automation of automations) {
    const startedAt = Date.now()

    try {
      // Parse das conditions do JSON do banco com o schema Zod (garante type-safety)
      const conditionsParse = z.array(automationConditionSchema).safeParse(automation.conditions)
      if (!conditionsParse.success) {
        console.error(
          `[automation-engine] Conditions inválidas para automação ${automation.id}:`,
          conditionsParse.error.flatten(),
        )
        continue
      }
      const conditions = conditionsParse.data

      // 1. Avaliação de condições
      const conditionsMet = evaluateConditions(deal, conditions)
      if (!conditionsMet) {
        await db.automationExecution.create({
          data: {
            automationId: automation.id,
            organizationId: event.orgId,
            dealId: event.dealId,
            status: 'SKIPPED',
            triggerPayload: event.payload as Prisma.InputJsonValue,
            actionResult: { reason: 'conditions_not_met' } as Prisma.InputJsonValue,
            durationMs: Date.now() - startedAt,
          },
        })
        continue
      }

      // 2. Deduplicação: previne re-execução para o mesmo deal na janela de 60min
      const duplicate = await isDuplicate(automation.id, event.dealId, DEFAULT_DEDUP_WINDOW_MS)
      if (duplicate) {
        console.info(
          `[automation-engine] Dedup: automação ${automation.id} já executou para deal ${event.dealId} nos últimos 60min`,
        )
        continue
      }

      // nome já vem no DTO de getActiveAutomationsByTrigger — sem query extra
      const executor = getExecutor(automation.actionType)
      const result = await executor({
        orgId: event.orgId,
        automationId: automation.id,
        automationName: automation.name,
        deal,
        actionConfig: automation.actionConfig,
      })

      // 5. Registra execução com sucesso
      await db.automationExecution.create({
        data: {
          automationId: automation.id,
          organizationId: event.orgId,
          dealId: event.dealId,
          status: 'SUCCESS',
          triggerPayload: event.payload as Prisma.InputJsonValue,
          actionResult: result.summary as Prisma.InputJsonValue,
          durationMs: Date.now() - startedAt,
        },
      })

      // 6. Incrementa contadores e invalida caches da automação
      await db.automation.update({
        where: { id: automation.id },
        data: {
          executionCount: { increment: 1 },
          lastTriggeredAt: new Date(),
        },
      })

      revalidateTag(`automation:${automation.id}`)
      revalidateTag(`automations:${event.orgId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(
        `[automation-engine] Falha ao executar automação ${automation.id} para deal ${event.dealId}:`,
        errorMessage,
      )

      await db.automationExecution.create({
        data: {
          automationId: automation.id,
          organizationId: event.orgId,
          dealId: event.dealId,
          status: 'FAILED',
          triggerPayload: event.payload as Prisma.InputJsonValue,
          errorMessage,
          durationMs: Date.now() - startedAt,
        },
      }).catch(() => {})
    }
  }
}

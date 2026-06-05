import 'server-only'
import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { getActiveAutomationsByTrigger } from '@/_data-access/automation/get-active-automations-by-trigger'
import { evaluateConditions } from './evaluate-conditions'
import { getExecutor } from './executors'
import { automationConditionSchema } from '@/_actions/automation/create-automation/schema'
import type {
  AutomationEvent,
  AutomationSubjectKind,
  ContactCreatedConfig,
  ContactForEvaluation,
  DealForEvaluation,
  DealMovedConfig,
  DealCreatedConfig,
  DealStatusChangedConfig,
  DealStaleConfig,
  DealIdleInStageConfig,
  ActivityCreatedConfig,
} from './types'
import type { AutomationTrigger, DealStatus, Prisma } from '@prisma/client'
import { z } from 'zod'

// Janela de deduplicação padrão: 60 minutos
const DEFAULT_DEDUP_WINDOW_MS = 60 * 60 * 1000

function tryRevalidateAutomationCache(automationId: string, orgId: string): void {
  try {
    revalidateTag(`automation:${automationId}`)
    revalidateTag(`automations:${orgId}`)
  } catch {
    // revalidateTag indisponível fora do contexto de request Next.js (ex: Trigger.dev)
  }
}

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
      contacts: {
        select: {
          id: true,
          contactId: true,
          isPrimary: true,
          contact: { select: { name: true, phone: true } },
        },
        orderBy: { isPrimary: 'desc' },
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
    contacts: deal.contacts,
  }
}

/**
 * Busca o contato do banco para avaliação de condições.
 * Lazy pelo orquestrador para não adicionar queries extras nas actions/webhooks.
 */
async function fetchContactForEvaluation(contactId: string): Promise<ContactForEvaluation | null> {
  return db.contact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      assignedTo: true,
      lifecycleStage: true,
      firstCaptureChannel: true,
    },
  })
}

// ─────────────────────────────────────────────────────────────
// Validação do triggerConfig contra o evento real
// ─────────────────────────────────────────────────────────────

/**
 * Confere se o triggerConfig (gravado na automação) bate com o payload do evento.
 * Campo `undefined` no config = wildcard (qualquer valor passa).
 *
 * Sem isso, automações configuradas para um pipeline específico disparam em
 * eventos de qualquer pipeline (bug histórico do motor).
 */
function triggerConfigMatches(
  triggerType: AutomationTrigger,
  triggerConfig: Record<string, unknown>,
  event: AutomationEvent,
): boolean {
  const payload = event.payload

  if (triggerType === 'DEAL_MOVED') {
    const config = triggerConfig as Partial<DealMovedConfig>
    if (config.pipelineId && payload.pipelineId !== config.pipelineId) return false
    if (config.toStageId && payload.toStageId !== config.toStageId) return false
    if (config.fromStageId && payload.fromStageId !== config.fromStageId) return false
    return true
  }

  if (triggerType === 'DEAL_CREATED') {
    const config = triggerConfig as Partial<DealCreatedConfig>
    if (config.pipelineId && payload.pipelineId !== config.pipelineId) return false
    if (config.stageId && payload.stageId !== config.stageId) return false
    return true
  }

  if (triggerType === 'DEAL_STATUS_CHANGED') {
    const config = triggerConfig as Partial<DealStatusChangedConfig>
    if (config.pipelineId && payload.pipelineId !== config.pipelineId) return false
    if (config.statuses && config.statuses.length > 0) {
      const status = payload.status as DealStatus | undefined
      if (!status || !config.statuses.includes(status)) return false
    }
    return true
  }

  if (triggerType === 'DEAL_STALE') {
    const config = triggerConfig as Partial<DealStaleConfig>
    if (config.pipelineId && payload.pipelineId !== config.pipelineId) return false
    return true
  }

  if (triggerType === 'DEAL_IDLE_IN_STAGE') {
    const config = triggerConfig as Partial<DealIdleInStageConfig>
    if (config.stageId && payload.stageId !== config.stageId) return false
    return true
  }

  if (triggerType === 'ACTIVITY_CREATED') {
    const config = triggerConfig as Partial<ActivityCreatedConfig>
    if (config.pipelineId && payload.pipelineId !== config.pipelineId) return false
    if (config.activityTypes && config.activityTypes.length > 0) {
      const activityType = payload.activityType as string | undefined
      if (!activityType || !config.activityTypes.includes(activityType)) return false
    }
    return true
  }

  if (triggerType === 'CONTACT_CREATED') {
    const config = triggerConfig as Partial<ContactCreatedConfig>
    if (config.lifecycleStage && payload.lifecycleStage !== config.lifecycleStage) return false
    if (config.sources && config.sources.length > 0) {
      const source = payload.source as string | undefined
      if (!source || !(config.sources as string[]).includes(source)) return false
    }
    return true
  }

  return true
}

// ─────────────────────────────────────────────────────────────
// Verificação de deduplicação
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se já existe uma execução recente para o mesmo par automationId + subject.
 * Previne dupla execução entre event-hooks e cron ticks.
 */
async function isDuplicate(
  automationId: string,
  subjectKind: AutomationSubjectKind,
  subjectId: string,
  windowMs: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs)
  const subjectFilter =
    subjectKind === 'deal' ? { dealId: subjectId } : { contactId: subjectId }
  const existing = await db.automationExecution.findFirst({
    where: {
      automationId,
      ...subjectFilter,
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

  const subject =
    event.subjectKind === 'deal'
      ? await fetchDealForEvaluation(event.dealId)
      : await fetchContactForEvaluation(event.contactId)

  if (!subject) {
    console.error(`[automation-engine] Subject não encontrado para evento ${event.triggerType}`)
    return
  }

  const subjectId = event.subjectKind === 'deal' ? event.dealId : event.contactId
  const subjectIdField =
    event.subjectKind === 'deal' ? { dealId: event.dealId } : { contactId: event.contactId }

  const deal = event.subjectKind === 'deal' ? (subject as DealForEvaluation) : null
  const contact = event.subjectKind === 'contact' ? (subject as ContactForEvaluation) : null

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

      // 0. Validação do triggerConfig contra o payload do evento
      // event.triggerType é o filtro usado na busca, então é o mesmo da automação.
      const triggerConfig = (automation.triggerConfig ?? {}) as Record<string, unknown>
      if (!triggerConfigMatches(event.triggerType, triggerConfig, event)) {
        await db.automationExecution.create({
          data: {
            automationId: automation.id,
            organizationId: event.orgId,
            ...subjectIdField,
            status: 'SKIPPED',
            triggerPayload: event.payload as Prisma.InputJsonValue,
            actionResult: { reason: 'trigger_config_mismatch' } as Prisma.InputJsonValue,
            durationMs: Date.now() - startedAt,
          },
        })
        tryRevalidateAutomationCache(automation.id, event.orgId)
        continue
      }

      // 1. Avaliação de condições
      const conditionsMet = evaluateConditions(subject, conditions, event.subjectKind)
      if (!conditionsMet) {
        await db.automationExecution.create({
          data: {
            automationId: automation.id,
            organizationId: event.orgId,
            ...subjectIdField,
            status: 'SKIPPED',
            triggerPayload: event.payload as Prisma.InputJsonValue,
            actionResult: { reason: 'conditions_not_met' } as Prisma.InputJsonValue,
            durationMs: Date.now() - startedAt,
          },
        })
        tryRevalidateAutomationCache(automation.id, event.orgId)
        continue
      }

      // 2. Deduplicação: previne re-execução para o mesmo subject na janela de 60min
      const duplicate = await isDuplicate(
        automation.id,
        event.subjectKind,
        subjectId,
        DEFAULT_DEDUP_WINDOW_MS,
      )
      if (duplicate) {
        console.info(
          `[automation-engine] Dedup: automação ${automation.id} já executou para ${event.subjectKind} ${subjectId} nos últimos 60min`,
        )
        continue
      }

      // nome já vem no DTO de getActiveAutomationsByTrigger — sem query extra
      const executor = getExecutor(automation.actionType)
      const result = await executor({
        orgId: event.orgId,
        automationId: automation.id,
        automationName: automation.name,
        subjectKind: event.subjectKind,
        deal,
        contact,
        actionConfig: automation.actionConfig,
      })

      // 5. Registra execução com sucesso
      await db.automationExecution.create({
        data: {
          automationId: automation.id,
          organizationId: event.orgId,
          ...subjectIdField,
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

      tryRevalidateAutomationCache(automation.id, event.orgId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(
        `[automation-engine] Falha ao executar automação ${automation.id} para ${event.subjectKind} ${subjectId}:`,
        errorMessage,
      )

      await db.automationExecution.create({
        data: {
          automationId: automation.id,
          organizationId: event.orgId,
          ...subjectIdField,
          status: 'FAILED',
          triggerPayload: event.payload as Prisma.InputJsonValue,
          errorMessage,
          durationMs: Date.now() - startedAt,
        },
      }).catch(() => {})

      tryRevalidateAutomationCache(automation.id, event.orgId)
    }
  }
}

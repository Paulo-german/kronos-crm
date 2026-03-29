import 'server-only'
import type { AutomationTrigger, DealPriority, DealStatus } from '@prisma/client'
import type { AutomationCondition } from '@/_actions/automation/create-automation/schema'

// Re-exporta para que os executors e o evaluator usem a mesma fonte de verdade
export type { AutomationCondition }

// ─────────────────────────────────────────────────────────────
// Evento disparado pelas actions existentes (event-hooks) ou cron
// ─────────────────────────────────────────────────────────────

export interface AutomationEvent {
  orgId: string
  triggerType: AutomationTrigger
  dealId: string
  /** Dados de contexto do evento (stageId anterior, novo status, activityType, etc) */
  payload: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────
// Snapshot do deal usado na avaliação de condições
// Buscado sob demanda pelo orquestrador (lazy) para evitar queries extras nas actions
// ─────────────────────────────────────────────────────────────

export interface DealForEvaluation {
  id: string
  title: string
  stageId: string
  pipelineId: string
  assignedTo: string
  priority: DealPriority
  status: DealStatus
  /** Valor do deal em centavos (evita float aritmético) */
  value: number | null
}

// ─────────────────────────────────────────────────────────────
// Configs tipadas de trigger (espelham os Zod schemas do schema.ts)
// Usadas internamente pelo motor para safe-cast dos JSONs do banco
// ─────────────────────────────────────────────────────────────

export interface DealStaleConfig {
  thresholdMinutes: number
  pipelineId?: string
}

export interface DealIdleInStageConfig {
  stageId: string
  thresholdMinutes: number
}

export interface DealMovedConfig {
  fromStageId?: string
  toStageId?: string
  pipelineId?: string
}

export interface DealCreatedConfig {
  pipelineId?: string
  stageId?: string
}

export interface ActivityCreatedConfig {
  activityTypes?: string[]
  pipelineId?: string
}

export interface DealStatusChangedConfig {
  statuses?: DealStatus[]
  pipelineId?: string
}

// ─────────────────────────────────────────────────────────────
// Configs tipadas de action (espelham os Zod schemas do schema.ts)
// ─────────────────────────────────────────────────────────────

export interface ReassignDealConfig {
  strategy: 'round_robin' | 'specific_user' | 'least_deals'
  targetUserIds?: string[]
  excludeCurrentAssignee?: boolean
}

export interface MoveDealToStageConfig {
  targetStageId: string
}

export interface MarkDealLostConfig {
  lossReasonId?: string
}

export interface NotifyUserConfig {
  targetType: 'deal_assignee' | 'specific_users' | 'org_admins'
  targetUserIds?: string[]
  messageTemplate: string
}

export interface UpdateDealPriorityConfig {
  targetPriority: DealPriority
}

// ─────────────────────────────────────────────────────────────
// Contexto passado a cada executor
// ─────────────────────────────────────────────────────────────

export interface ExecutorContext {
  orgId: string
  automationId: string
  automationName: string
  deal: DealForEvaluation
  actionConfig: Record<string, unknown>
}

export interface ExecutorResult {
  /** Resumo legível para armazenar em AutomationExecution.actionResult */
  summary: Record<string, unknown>
}

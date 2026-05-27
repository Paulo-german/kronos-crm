import 'server-only'
import type { AutomationTrigger, CaptureChannel, DealPriority, DealStatus, LifecycleStage } from '@prisma/client'
import type { AutomationCondition } from '@/_actions/automation/create-automation/schema'

// Re-exporta para que os executors e o evaluator usem a mesma fonte de verdade
export type { AutomationCondition }

// ─────────────────────────────────────────────────────────────
// Evento disparado pelas actions existentes (event-hooks) ou cron
// Union discriminada por subjectKind: deal vs contact
// ─────────────────────────────────────────────────────────────

export type AutomationSubjectKind = 'deal' | 'contact'

interface AutomationEventBase {
  orgId: string
  triggerType: AutomationTrigger
  /** Dados de contexto do evento (stageId anterior, novo status, activityType, etc) */
  payload: Record<string, unknown>
}

export interface DealAutomationEvent extends AutomationEventBase {
  subjectKind: 'deal'
  dealId: string
}

export interface ContactAutomationEvent extends AutomationEventBase {
  subjectKind: 'contact'
  contactId: string
}

export type AutomationEvent = DealAutomationEvent | ContactAutomationEvent

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
  contacts: Array<{
    id: string
    contactId: string
    isPrimary: boolean
    contact: {
      name: string
      phone: string | null
    }
  }>
}

// ─────────────────────────────────────────────────────────────
// Snapshot do contato usado na avaliação de condições
// Buscado sob demanda pelo orquestrador (lazy)
// ─────────────────────────────────────────────────────────────

export interface ContactForEvaluation {
  id: string
  name: string
  phone: string | null
  email: string | null
  assignedTo: string | null
  lifecycleStage: LifecycleStage
  firstCaptureChannel: CaptureChannel | null
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

export interface ContactCreatedConfig {
  lifecycleStage?: LifecycleStage
  sources?: CaptureChannel[]
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

export type NotifyChannel = 'in_app' | 'whatsapp'

export interface NotifyUserConfig {
  targetType: 'deal_assignee' | 'specific_users' | 'org_admins'
  targetUserIds?: string[]
  messageTemplate: string
  /** Canais por onde a notificação é entregue. Ausente = ['in_app'] (backwards-compat). */
  channels?: NotifyChannel[]
}

export interface UpdateDealPriorityConfig {
  targetPriority: DealPriority
}

export interface UpdateContactLifecycleConfig {
  targetStage: LifecycleStage
}

export interface SendWhatsappFollowupConfig {
  inboxId: string
  noConversationBehavior: 'create' | 'skip'
  // Modo selfhosted
  messageTemplate?: string
  // Modo Meta Cloud
  metaTemplateName?: string
  metaTemplateLanguage?: string
  /** Valores posicionais das variáveis do body: índice 0 = {{1}} */
  metaBodyParams?: string[]
  /** Valores posicionais das variáveis do header: índice 0 = {{1}} */
  metaHeaderParams?: string[]
}

export type CreateTaskAssignStrategy = 'deal_assignee' | 'specific_user'

export type TaskActionType = 'TASK' | 'MEETING' | 'CALL' | 'WHATSAPP' | 'VISIT' | 'EMAIL'

export type TaskActionPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface CreateTaskActionConfig {
  /** Template do título com placeholders ({{deal.title}}, {{contact.firstName}}, ...) */
  titleTemplate: string
  /** Dias a partir de hoje (00:00) para o vencimento. Default 1. */
  dueInDays?: number
  /** Como definir o responsável da task */
  assignTo: CreateTaskAssignStrategy
  /** Obrigatório quando assignTo === 'specific_user' */
  assignToUserId?: string
  /** Default 'medium'. Persistido em activity.metadata (Task model não tem coluna priority). */
  priority?: TaskActionPriority
  /** Default 'TASK'. Mapeia para enum TaskType do schema. */
  taskType?: TaskActionType
}

// ─────────────────────────────────────────────────────────────
// Contexto passado a cada executor
// ─────────────────────────────────────────────────────────────

export interface ExecutorContext {
  orgId: string
  automationId: string
  automationName: string
  subjectKind: AutomationSubjectKind
  deal: DealForEvaluation | null
  contact: ContactForEvaluation | null
  actionConfig: Record<string, unknown>
}

export interface ExecutorResult {
  /** Resumo legível para armazenar em AutomationExecution.actionResult */
  summary: Record<string, unknown>
}

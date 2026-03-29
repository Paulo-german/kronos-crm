import { z } from 'zod'
import { ActivityType, AutomationTrigger, AutomationAction } from '@prisma/client'

// ─────────────────────────────────────────────────────────────
// Schemas para condições
// ─────────────────────────────────────────────────────────────

const CONDITION_OPERATORS = ['equals', 'not_equals', 'gt', 'lt', 'gte', 'lte', 'in', 'not_in'] as const
type ConditionOperator = (typeof CONDITION_OPERATORS)[number]

const CONDITION_FIELDS = ['stageId', 'assignedTo', 'priority', 'status', 'value', 'pipelineId'] as const

export const automationConditionSchema = z.object({
  field: z.enum(CONDITION_FIELDS),
  operator: z.enum(CONDITION_OPERATORS),
  // Polimorfismo controlado: string, number ou array de strings dependendo do operator
  value: z.union([z.string(), z.number(), z.array(z.string())]),
})

export type AutomationCondition = z.infer<typeof automationConditionSchema>
export type { ConditionOperator }

// ─────────────────────────────────────────────────────────────
// Schemas de triggerConfig por tipo
// ─────────────────────────────────────────────────────────────

export const dealStaleConfigSchema = z.object({
  thresholdMinutes: z.number().int().min(1),
  pipelineId: z.string().uuid().optional(),
})

export const dealIdleInStageConfigSchema = z.object({
  stageId: z.string().uuid(),
  thresholdMinutes: z.number().int().min(1),
})

export const dealMovedConfigSchema = z.object({
  fromStageId: z.string().uuid().optional(),
  toStageId: z.string().uuid().optional(),
  pipelineId: z.string().uuid().optional(),
})

export const dealCreatedConfigSchema = z.object({
  pipelineId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
})

export const activityCreatedConfigSchema = z.object({
  activityTypes: z.array(z.nativeEnum(ActivityType)).optional(),
  pipelineId: z.string().uuid().optional(),
})

export const dealStatusChangedConfigSchema = z.object({
  statuses: z.array(z.enum(['OPEN', 'WON', 'LOST', 'PAUSED', 'IN_PROGRESS'])).optional(),
  pipelineId: z.string().uuid().optional(),
})

// ─────────────────────────────────────────────────────────────
// Schemas de actionConfig por tipo
// ─────────────────────────────────────────────────────────────

export const reassignDealConfigSchema = z
  .object({
    strategy: z.enum(['round_robin', 'specific_user', 'least_deals']),
    targetUserIds: z.array(z.string().uuid()).optional(),
    excludeCurrentAssignee: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Todas as estratégias exigem ao menos um membro no pool de atribuição
    if (!data.targetUserIds || data.targetUserIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetUserIds'],
        message: 'Selecione ao menos um membro para o pool de atribuição.',
      })
    }
  })

export const moveDealToStageConfigSchema = z.object({
  targetStageId: z.string().uuid(),
})

export const markDealLostConfigSchema = z.object({
  lossReasonId: z.string().uuid().optional(),
})

export const notifyUserConfigSchema = z
  .object({
    targetType: z.enum(['deal_assignee', 'specific_users', 'org_admins']),
    targetUserIds: z.array(z.string().uuid()).optional(),
    messageTemplate: z.string().min(1).max(500),
  })
  .superRefine((data, ctx) => {
    // Usuários específicos exigem ao menos um ID selecionado
    if (data.targetType === 'specific_users' && (!data.targetUserIds || data.targetUserIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetUserIds'],
        message: 'Selecione ao menos um membro para notificar.',
      })
    }
  })

export const updateDealPriorityConfigSchema = z.object({
  targetPriority: z.enum(['low', 'medium', 'high', 'urgent']),
})

// ─────────────────────────────────────────────────────────────
// Schema principal de criação (com validação cross-field via superRefine)
// ─────────────────────────────────────────────────────────────

export const createAutomationSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  description: z.string().trim().max(500).optional(),
  triggerType: z.nativeEnum(AutomationTrigger),
  // Validado de forma cruzada por triggerType no superRefine abaixo
  triggerConfig: z.record(z.string(), z.unknown()),
  conditions: z.array(automationConditionSchema).max(5).default([]),
  actionType: z.nativeEnum(AutomationAction),
  // Validado de forma cruzada por actionType no superRefine abaixo
  actionConfig: z.record(z.string(), z.unknown()),
}).superRefine((data, ctx) => {
  // Validação cruzada do triggerConfig pelo tipo de trigger
  const triggerValidators: Record<AutomationTrigger, z.ZodTypeAny> = {
    [AutomationTrigger.DEAL_STALE]: dealStaleConfigSchema,
    [AutomationTrigger.DEAL_IDLE_IN_STAGE]: dealIdleInStageConfigSchema,
    [AutomationTrigger.DEAL_MOVED]: dealMovedConfigSchema,
    [AutomationTrigger.DEAL_CREATED]: dealCreatedConfigSchema,
    [AutomationTrigger.ACTIVITY_CREATED]: activityCreatedConfigSchema,
    [AutomationTrigger.DEAL_STATUS_CHANGED]: dealStatusChangedConfigSchema,
  }

  const triggerResult = triggerValidators[data.triggerType].safeParse(data.triggerConfig)
  if (!triggerResult.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['triggerConfig'],
      message: `Configuração inválida para trigger ${data.triggerType}: ${triggerResult.error.message}`,
    })
  }

  // Validação cruzada do actionConfig pelo tipo de ação
  const actionValidators: Record<AutomationAction, z.ZodTypeAny> = {
    [AutomationAction.REASSIGN_DEAL]: reassignDealConfigSchema,
    [AutomationAction.MOVE_DEAL_TO_STAGE]: moveDealToStageConfigSchema,
    [AutomationAction.MARK_DEAL_LOST]: markDealLostConfigSchema,
    [AutomationAction.NOTIFY_USER]: notifyUserConfigSchema,
    [AutomationAction.UPDATE_DEAL_PRIORITY]: updateDealPriorityConfigSchema,
  }

  const actionResult = actionValidators[data.actionType].safeParse(data.actionConfig)
  if (!actionResult.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['actionConfig'],
      message: `Configuração inválida para ação ${data.actionType}: ${actionResult.error.message}`,
    })
  }
})

export type CreateAutomationInput = z.infer<typeof createAutomationSchema>

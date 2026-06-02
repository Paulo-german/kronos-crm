import { z } from 'zod'
import { ActivityType, AutomationTrigger, AutomationAction, CaptureChannel, LifecycleStage } from '@prisma/client'
import { CONTACT_TRIGGER_VALUES, CONTACT_SUPPORTED_ACTION_VALUES } from '@/_lib/automations/contact-compatibility'

// ─────────────────────────────────────────────────────────────
// Schemas para condições
// ─────────────────────────────────────────────────────────────

const CONDITION_OPERATORS = ['equals', 'not_equals', 'gt', 'lt', 'gte', 'lte', 'in', 'not_in'] as const
type ConditionOperator = (typeof CONDITION_OPERATORS)[number]

const CONDITION_FIELDS = ['stageId', 'assignedTo', 'priority', 'status', 'value', 'pipelineId', 'lifecycleStage', 'source'] as const

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

export const contactCreatedConfigSchema = z.object({
  lifecycleStage: z.nativeEnum(LifecycleStage).optional(),
  sources: z.array(z.nativeEnum(CaptureChannel)).optional(),
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
    channels: z
      .array(z.enum(['in_app', 'whatsapp']))
      .min(1, 'Selecione ao menos um canal de notificação.')
      .default(['in_app']),
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

export const SENTINEL_DEAL_INBOX = 'deal_inbox' as const

export const sendWhatsappFollowupConfigSchema = z
  .object({
    inboxId: z.union([
      z.literal(SENTINEL_DEAL_INBOX),
      z.string().uuid('ID do inbox inválido'),
    ]),
    noConversationBehavior: z.enum(['create', 'skip'], { message: 'Comportamento inválido' }),
    // Modo selfhosted: texto livre com placeholders CRM
    messageTemplate: z.string().trim().max(1000, 'Máximo de 1000 caracteres').optional(),
    // Modo Meta Cloud: template pré-aprovado com variáveis posicionais
    metaTemplateName: z.string().trim().optional(),
    metaTemplateLanguage: z.string().trim().optional(),
    metaBodyParams: z.array(z.string()).optional(),
    metaHeaderParams: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    const isMeta = !!data.metaTemplateName
    if (isMeta) {
      if (!data.metaTemplateLanguage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['metaTemplateLanguage'],
          message: 'Idioma do template é obrigatório',
        })
      }
    } else {
      if (!data.messageTemplate || data.messageTemplate.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['messageTemplate'],
          message: 'Mensagem é obrigatória',
        })
      }
    }
  })

export const updateContactLifecycleConfigSchema = z
  .object({
    targetStage: z.nativeEnum(LifecycleStage),
    createDeal: z.boolean().optional(),
    dealPipelineId: z.string().uuid().optional(),
    dealStageId: z.string().uuid().optional(),
    dealTitleTemplate: z.string().trim().max(200).optional(),
    dealAssignTo: z.enum(['contact_assignee', 'specific_user']).optional(),
    dealAssignToUserId: z.string().uuid().optional(),
    dealDefaultValue: z.number().min(0).optional(),
    dealPriority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  })
  .superRefine((data, ctx) => {
    // Sem deal → nenhum campo de criação de deal é exigido
    if (!data.createDeal) return

    if (!data.dealPipelineId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dealPipelineId'],
        message: 'Selecione o pipeline da negociação.',
      })
    }
    if (!data.dealStageId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dealStageId'],
        message: 'Selecione o estágio da negociação.',
      })
    }
    if (data.dealAssignTo === 'specific_user' && !data.dealAssignToUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dealAssignToUserId'],
        message: 'Selecione o responsável pela negociação.',
      })
    }
  })

export const createTaskConfigSchema = z
  .object({
    titleTemplate: z
      .string()
      .trim()
      .min(1, 'Título é obrigatório')
      .max(200, 'Máximo de 200 caracteres'),
    dueInDays: z
      .number({ message: 'Informe os dias até o vencimento' })
      .int('Use apenas números inteiros')
      .min(0, 'Não pode ser negativo')
      .max(365, 'Máximo de 365 dias')
      .default(1),
    assignTo: z.enum(['deal_assignee', 'specific_user'], {
      message: 'Selecione como atribuir a tarefa',
    }),
    assignToUserId: z.string().uuid('ID de usuário inválido').optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    taskType: z
      .enum(['TASK', 'MEETING', 'CALL', 'WHATSAPP', 'VISIT', 'EMAIL'])
      .default('TASK'),
  })
  .superRefine((data, ctx) => {
    // Quando 'specific_user', exige userId
    if (data.assignTo === 'specific_user' && !data.assignToUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['assignToUserId'],
        message: 'Selecione o membro responsável pela tarefa.',
      })
    }
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
    [AutomationTrigger.CONTACT_CREATED]: contactCreatedConfigSchema,
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
    [AutomationAction.SEND_WHATSAPP_FOLLOWUP]: sendWhatsappFollowupConfigSchema,
    [AutomationAction.UPDATE_CONTACT_LIFECYCLE]: updateContactLifecycleConfigSchema,
    [AutomationAction.CREATE_TASK]: createTaskConfigSchema,
  }

  const actionResult = actionValidators[data.actionType].safeParse(data.actionConfig)
  if (!actionResult.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['actionConfig'],
      message: `Configuração inválida para ação ${data.actionType}: ${actionResult.error.message}`,
    })
  }

  // Valida compatibilidade entre triggerType e actionType
  // Triggers de contato só suportam ações que operam sem um deal
  const CONTACT_TRIGGERS = new Set<AutomationTrigger>(CONTACT_TRIGGER_VALUES)
  const CONTACT_SUPPORTED_ACTIONS = new Set<AutomationAction>(CONTACT_SUPPORTED_ACTION_VALUES)
  const isContactTrigger = CONTACT_TRIGGERS.has(data.triggerType)

  if (isContactTrigger && !CONTACT_SUPPORTED_ACTIONS.has(data.actionType)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['actionType'],
      message: `O trigger ${data.triggerType} só é compatível com: ${[...CONTACT_SUPPORTED_ACTIONS].join(', ')}`,
    })
  }

  // NOTIFY_USER em trigger de contato não pode notificar o responsável da negociação (não há deal)
  if (isContactTrigger && data.actionType === AutomationAction.NOTIFY_USER) {
    const target = (data.actionConfig as { targetType?: string }).targetType
    if (target === 'deal_assignee') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actionConfig'],
        message: 'Triggers de contato não podem notificar o responsável pela negociação (não há negociação).',
      })
    }
  }
})

export type CreateAutomationInput = z.infer<typeof createAutomationSchema>

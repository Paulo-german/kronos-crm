import { z } from 'zod'
import { LifecycleStage } from '@prisma/client'
import { AGENT_MODEL_IDS } from '@/_lib/ai/models'
import { promptConfigSchema } from '../shared/prompt-config-schema'
import { exportGlobalToolsArraySchema } from '../shared/global-tool-schema'
import { stepActionSchema } from '../shared/step-action-schema'
import { autoTaskItemSchema } from '../shared/step-fields-schema'
import { businessHoursConfigSchema } from '../update-agent/schema'
import { followUpBusinessHoursConfigSchema } from '@/_actions/follow-up/update-follow-up-business-hours/schema'
import { exhaustedConfigSchema } from '@/_actions/follow-up/update-follow-up-exhausted/schema'

// Versão do formato de export. Bump apenas em mudanças incompatíveis de shape.
export const EXPORT_VERSION = '1' as const

const exportedStepSchema = z.object({
  name: z.string().min(1),
  objective: z.string().min(1),
  allowedActions: z.array(z.string()).default([]),
  activationRequirement: z.string().nullable().default(null),
  order: z.number().int(),
  actions: z.array(stepActionSchema).nullable().default(null),
  keyQuestion: z.string().nullable().default(null),
  messageTemplate: z.string().nullable().default(null),
  lifecycleTrigger: z.nativeEnum(LifecycleStage).nullable().default(null),
  // FKs de pipeline/stage — ignoradas no import (zeradas em sanitize-import).
  lifecycleDealPipelineId: z.string().nullable().default(null),
  autoDealStageId: z.string().nullable().default(null),
  autoTasks: z.array(autoTaskItemSchema).nullable().default(null),
})

const exportedAgentSchema = z.object({
  name: z.string().min(1),
  systemPrompt: z.string().default(''),
  promptConfig: promptConfigSchema.nullable().default(null),
  modelId: z.enum(AGENT_MODEL_IDS).optional(),
  agentVersion: z.enum(['single-v1', 'single-v2', 'crew-v1']).optional(),
  agentMode: z.enum(['PRODUCT', 'SERVICE', 'HYBRID']).default('PRODUCT'),
  debounceSeconds: z.number().int().min(0).max(120).default(3),
  isActive: z.boolean().default(false),
  businessHoursEnabled: z.boolean().default(false),
  businessHoursTimezone: z.string().default('America/Sao_Paulo'),
  businessHoursConfig: businessHoursConfigSchema.nullable().default(null),
  outOfHoursMessage: z.string().nullable().default(null),
  followUpBusinessHoursEnabled: z.boolean().default(false),
  followUpBusinessHoursTimezone: z.string().default('America/Sao_Paulo'),
  followUpBusinessHoursConfig: followUpBusinessHoursConfigSchema
    .nullable()
    .default(null),
  followUpExhaustedAction: z
    .enum(['NONE', 'NOTIFY_HUMAN', 'MOVE_DEAL_STAGE'])
    .default('NONE'),
  // exhaustedConfigSchema já é .nullable().optional()
  followUpExhaustedConfig: exhaustedConfigSchema,
  // No contexto de export, globalTools[].stepIds carrega ORDERS serializados
  // (ex: "0", "1"), não UUIDs — UUIDs de step não são portáveis entre orgs.
  // O remap de volta para UUIDs acontece no import (remap-global-tools.ts).
  globalTools: exportGlobalToolsArraySchema.default([]),
  steps: z.array(exportedStepSchema).default([]),
})

export const importAgentSchema = z.object({
  exportVersion: z.literal(EXPORT_VERSION),
  exportedAt: z.string().optional(),
  agent: exportedAgentSchema,
})

export type ImportAgentInput = z.infer<typeof importAgentSchema>
export type ExportedAgent = z.infer<typeof exportedAgentSchema>
export type ExportedStep = z.infer<typeof exportedStepSchema>

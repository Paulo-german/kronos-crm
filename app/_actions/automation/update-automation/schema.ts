import { z } from 'zod'
import { AutomationTrigger, AutomationAction } from '@prisma/client'
import {
  automationConditionSchema,
  dealStaleConfigSchema,
  dealIdleInStageConfigSchema,
  dealMovedConfigSchema,
  dealCreatedConfigSchema,
  activityCreatedConfigSchema,
  dealStatusChangedConfigSchema,
  reassignDealConfigSchema,
  moveDealToStageConfigSchema,
  markDealLostConfigSchema,
  notifyUserConfigSchema,
  updateDealPriorityConfigSchema,
} from '../create-automation/schema'

// Re-exporta os sub-schemas para que consumers possam importar daqui
export {
  automationConditionSchema,
  dealStaleConfigSchema,
  dealIdleInStageConfigSchema,
  dealMovedConfigSchema,
  dealCreatedConfigSchema,
  activityCreatedConfigSchema,
  dealStatusChangedConfigSchema,
  reassignDealConfigSchema,
  moveDealToStageConfigSchema,
  markDealLostConfigSchema,
  notifyUserConfigSchema,
  updateDealPriorityConfigSchema,
}

// ─────────────────────────────────────────────────────────────
// Schema de atualização (todos os campos são opcionais exceto id)
// A validação cruzada de triggerConfig/actionConfig é feita na action
// quando um dos lados vem sem o outro (usando o tipo salvo no banco).
// ─────────────────────────────────────────────────────────────

export const updateAutomationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  triggerType: z.nativeEnum(AutomationTrigger).optional(),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  conditions: z.array(automationConditionSchema).max(5).optional(),
  actionType: z.nativeEnum(AutomationAction).optional(),
  actionConfig: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>

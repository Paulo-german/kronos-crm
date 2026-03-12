import { z } from 'zod'
import { businessHoursConfigSchema } from '../update-agent/schema'
import { promptConfigSchema } from '../shared/prompt-config-schema'

export const createAgentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  promptConfig: promptConfigSchema,
  systemPrompt: z.string().optional(),
  modelId: z.string().optional(),
  debounceSeconds: z.number().int().min(0).max(30).optional(),
  pipelineIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().optional(),
  businessHoursEnabled: z.boolean().optional(),
  businessHoursTimezone: z.string().optional(),
  businessHoursConfig: businessHoursConfigSchema.optional(),
  outOfHoursMessage: z.string().nullable().optional(),
})

export type CreateAgentInput = z.infer<typeof createAgentSchema>

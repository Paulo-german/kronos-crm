import { z } from 'zod'
import { AGENT_MODEL_IDS } from '@/_lib/ai/models'
import { promptConfigSchema } from '../shared/prompt-config-schema'

const dayScheduleSchema = z
  .object({
    enabled: z.boolean(),
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  })
  .refine((data) => !data.enabled || data.start < data.end, {
    message: 'Horário de início deve ser anterior ao fim.',
    path: ['end'],
  })

export const businessHoursConfigSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
})

export type DaySchedule = z.infer<typeof dayScheduleSchema>
export type BusinessHoursConfig = z.infer<typeof businessHoursConfigSchema>

export const updateAgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome não pode ser vazio').optional(),
  promptConfig: promptConfigSchema.nullable().optional(),
  systemPrompt: z.string().optional(),
  modelId: z.enum(AGENT_MODEL_IDS).optional(),
  debounceSeconds: z.number().int().min(0).max(30).optional(),
  pipelineIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().optional(),
  businessHoursEnabled: z.boolean().optional(),
  businessHoursTimezone: z.string().optional(),
  businessHoursConfig: businessHoursConfigSchema.optional(),
  outOfHoursMessage: z.string().nullable().optional(),
})

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>

import { z } from 'zod'

const dayScheduleSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
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
  systemPrompt: z.string().min(1, 'Prompt não pode ser vazio').optional(),
  modelId: z.string().optional(),
  debounceSeconds: z.number().int().min(0).max(30).optional(),
  pipelineIds: z.array(z.string().uuid()).optional(),
  toolsEnabled: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  businessHoursEnabled: z.boolean().optional(),
  businessHoursTimezone: z.string().optional(),
  businessHoursConfig: businessHoursConfigSchema.optional(),
  outOfHoursMessage: z.string().nullable().optional(),
})

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>

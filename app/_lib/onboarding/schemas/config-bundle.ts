import { z } from 'zod'
import { businessHoursConfigSchema } from '@/_actions/agent/update-agent/schema'

export const pipelineStageSchema = z.object({
  name: z.string().min(1),
  position: z.number().int().min(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

export const configBundleSchema = z.object({
  pipelineStages: z.array(pipelineStageSchema).min(4).max(9),

  promptConfig: z.object({
    role: z.enum(['sdr', 'closer', 'support', 'receptionist', 'custom']),
    tone: z.enum(['formal', 'professional', 'friendly', 'casual']),
    responseLength: z.enum(['short', 'medium', 'detailed']),
    useEmojis: z.boolean(),
    language: z.enum(['pt-BR', 'en', 'es', 'auto']),
    targetAudience: z.string().min(1),
    guidelines: z.array(z.string()).min(3).max(10),
    restrictions: z.array(z.string()).min(2).max(8),
  }),

  lostReasons: z.array(z.string()).min(4).max(8),

  businessHoursEnabled: z.boolean(),
  businessHoursConfig: businessHoursConfigSchema,
  outOfHoursMessage: z.string().min(1),
})

export type ConfigBundle = z.infer<typeof configBundleSchema>

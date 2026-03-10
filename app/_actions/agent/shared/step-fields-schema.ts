import { z } from 'zod'
import { stepActionSchema } from './step-action-schema'

export const stepFieldsSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  objective: z.string().min(1, 'Objetivo é obrigatório'),
  actions: z.array(stepActionSchema).optional().default([]),
  keyQuestion: z.string().max(500).optional(),
  messageTemplate: z.string().max(1000).optional(),
})

export type StepFields = z.infer<typeof stepFieldsSchema>

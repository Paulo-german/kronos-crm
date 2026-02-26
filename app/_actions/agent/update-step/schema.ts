import { z } from 'zod'

export const updateStepSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  name: z.string().min(1, 'Nome não pode ser vazio').optional(),
  objective: z.string().min(1, 'Objetivo não pode ser vazio').optional(),
  allowedActions: z.array(z.string()).optional(),
  activationRequirement: z.string().nullable().optional(),
})

export type UpdateStepInput = z.infer<typeof updateStepSchema>

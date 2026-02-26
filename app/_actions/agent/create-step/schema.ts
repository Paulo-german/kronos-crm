import { z } from 'zod'

export const createStepSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
  objective: z.string().min(1, 'Objetivo é obrigatório'),
  allowedActions: z.array(z.string()).optional(),
  activationRequirement: z.string().optional(),
})

export type CreateStepInput = z.infer<typeof createStepSchema>

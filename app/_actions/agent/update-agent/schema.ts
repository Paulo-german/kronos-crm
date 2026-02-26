import { z } from 'zod'

export const updateAgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome não pode ser vazio').optional(),
  systemPrompt: z.string().min(1, 'Prompt não pode ser vazio').optional(),
  modelId: z.string().optional(),
  debounceSeconds: z.number().int().min(0).max(30).optional(),
  pipelineIds: z.array(z.string().uuid()).optional(),
  toolsEnabled: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>

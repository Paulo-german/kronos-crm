import { z } from 'zod'

export const createStageSchema = z.object({
  pipelineId: z.string().uuid('ID do pipeline inválido'),
  name: z.string().min(1, 'Nome é obrigatório'),
  color: z.string().optional(),
})

export type CreateStageInput = z.infer<typeof createStageSchema>

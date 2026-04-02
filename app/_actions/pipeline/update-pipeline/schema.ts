import { z } from 'zod'

export const updatePipelineSchema = z.object({
  pipelineId: z.string().uuid('ID do pipeline inválido'),
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo').optional(),
  showIdleDays: z.boolean().optional(),
})

export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>

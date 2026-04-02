import { z } from 'zod'

export const createPipelineSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
})

export type CreatePipelineInput = z.infer<typeof createPipelineSchema>

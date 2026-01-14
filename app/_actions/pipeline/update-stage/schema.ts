import { z } from 'zod'

export const updateStageSchema = z.object({
  id: z.string().uuid('ID da etapa inválido'),
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  color: z.string().optional(),
  position: z.number().int().positive().optional(),
})

export type UpdateStageInput = z.infer<typeof updateStageSchema>

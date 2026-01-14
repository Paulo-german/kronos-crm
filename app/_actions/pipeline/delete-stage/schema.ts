import { z } from 'zod'

export const deleteStageSchema = z.object({
  id: z.string().uuid('ID da etapa inválido'),
})

export type DeleteStageInput = z.infer<typeof deleteStageSchema>

import { z } from 'zod'

export const moveDealToStageSchema = z.object({
  dealId: z.string().uuid('ID do deal inválido'),
  stageId: z.string().uuid('ID da etapa inválido'),
})

export type MoveDealToStageInput = z.infer<typeof moveDealToStageSchema>

import { z } from 'zod'

export const transferDealToPipelineSchema = z.object({
  dealId: z.string().uuid('ID do deal inválido'),
  targetPipelineId: z.string().uuid('ID do pipeline inválido'),
  targetStageId: z.string().uuid('ID da etapa inválido'),
})

export type TransferDealToPipelineInput = z.infer<typeof transferDealToPipelineSchema>

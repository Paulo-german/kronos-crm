import { z } from 'zod'

export const setWonLostStagesSchema = z.object({
  pipelineId: z.string().uuid('ID do pipeline inválido'),
  wonStageId: z.string().uuid('ID da etapa de ganho inválido').nullable(),
  lostStageId: z.string().uuid('ID da etapa de perda inválido').nullable(),
})

export type SetWonLostStagesInput = z.infer<typeof setWonLostStagesSchema>

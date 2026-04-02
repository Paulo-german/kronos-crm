import { z } from 'zod'

export const setDefaultPipelineSchema = z.object({
  pipelineId: z.string().uuid('ID do pipeline inválido'),
})

export type SetDefaultPipelineInput = z.infer<typeof setDefaultPipelineSchema>

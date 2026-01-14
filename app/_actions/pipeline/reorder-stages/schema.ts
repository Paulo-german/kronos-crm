import { z } from 'zod'

export const reorderStagesSchema = z.object({
  pipelineId: z.string().uuid('ID do pipeline inválido'),
  stageIds: z.array(z.string().uuid()).min(1, 'Lista de etapas é obrigatória'),
})

export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>

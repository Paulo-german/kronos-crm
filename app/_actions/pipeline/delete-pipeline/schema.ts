import { z } from 'zod'

export const deletePipelineSchema = z.object({
  pipelineId: z.string().uuid('ID do pipeline inválido'),
  // Obrigatório somente quando o pipeline sendo excluído é o default
  newDefaultPipelineId: z.string().uuid('ID do novo pipeline padrão inválido').optional(),
})

export type DeletePipelineInput = z.infer<typeof deletePipelineSchema>

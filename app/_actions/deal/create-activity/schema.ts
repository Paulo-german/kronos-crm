import { z } from 'zod'

export const createActivitySchema = z.object({
  dealId: z.string().uuid(),
  type: z.enum(['note', 'call', 'email', 'meeting']),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
})

export type CreateActivityInput = z.infer<typeof createActivitySchema>

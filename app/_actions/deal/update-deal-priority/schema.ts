import { z } from 'zod'

export const updateDealPrioritySchema = z.object({
  dealId: z.string().uuid('ID do deal inválido'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
})

export type UpdateDealPriorityInput = z.infer<typeof updateDealPrioritySchema>

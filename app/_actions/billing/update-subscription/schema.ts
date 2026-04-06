import { z } from 'zod'

export const updateSubscriptionSchema = z.object({
  targetPriceId: z.string().min(1, 'Target price ID é obrigatório'),
})

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>

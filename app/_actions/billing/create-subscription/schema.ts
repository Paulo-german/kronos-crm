import { z } from 'zod'

export const createSubscriptionSchema = z.object({
  priceId: z.string().min(1, 'Price ID é obrigatório'),
  seats: z.number().int().min(1).max(100),
  paymentMethodId: z.string().min(1, 'Método de pagamento é obrigatório'),
})

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>

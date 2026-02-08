import { z } from 'zod'

export const createCheckoutSessionSchema = z.object({
  priceId: z.string().min(1, 'Price ID é obrigatório'),
})

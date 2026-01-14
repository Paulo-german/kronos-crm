import { z } from 'zod'

export const addDealProductSchema = z.object({
  dealId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().min(1, 'Quantidade mínima é 1'),
  unitPrice: z.number().min(0, 'Preço não pode ser negativo'),
  discountType: z.enum(['percentage', 'fixed']).default('percentage'),
  discountValue: z.number().min(0).default(0),
})

export type AddDealProductInput = z.infer<typeof addDealProductSchema>

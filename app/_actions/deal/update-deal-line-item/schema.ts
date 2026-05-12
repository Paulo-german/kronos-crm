import { z } from 'zod'

export const updateDealLineItemSchema = z
  .object({
    lineItemId: z.string().uuid(),
    quantity: z.number().int().min(1, 'Quantidade mínima é 1'),
    unitPrice: z.number().min(0, 'Preço não pode ser negativo'),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.number().min(0),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === 'percentage' && data.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Desconto percentual não pode exceder 100%',
      })
    }
  })

export type UpdateDealLineItemInput = z.infer<typeof updateDealLineItemSchema>

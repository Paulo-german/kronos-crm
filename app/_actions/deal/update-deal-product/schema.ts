import { z } from 'zod'

export const updateDealProductSchema = z
  .object({
    dealProductId: z.string().uuid('ID do produto inválido'),
    quantity: z.number().int().min(1, 'Quantidade mínima é 1'),
    unitPrice: z.number().min(0, 'Preço não pode ser negativo'),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.number().min(0, 'Desconto não pode ser negativo'),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === 'percentage' && data.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Desconto percentual não pode ser maior que 100%',
        path: ['discountValue'],
      })
    }
  })

export type UpdateDealProductInput = z.infer<typeof updateDealProductSchema>

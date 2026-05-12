import { z } from 'zod'

export const addDealLineItemSchema = z
  .object({
    dealId: z.string().uuid(),
    itemType: z.enum(['PRODUCT', 'SERVICE', 'PROMOTION']),
    productId: z.string().uuid().optional(),
    serviceId: z.string().uuid().optional(),
    promotionId: z.string().uuid().optional(),
    quantity: z.number().int().min(1, 'Quantidade mínima é 1'),
    unitPrice: z.number().min(0, 'Preço não pode ser negativo'),
    discountType: z.enum(['percentage', 'fixed']).default('percentage'),
    discountValue: z.number().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    // Exatamente um FK preenchido conforme o itemType
    const typeToKey: Record<typeof data.itemType, string | undefined> = {
      PRODUCT: data.productId,
      SERVICE: data.serviceId,
      PROMOTION: data.promotionId,
    }
    if (!typeToKey[data.itemType]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.itemType.toLowerCase()}Id obrigatório para itemType ${data.itemType}`,
      })
    }
    if (data.discountType === 'percentage' && data.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Desconto percentual não pode exceder 100%',
      })
    }
  })

export type AddDealLineItemInput = z.infer<typeof addDealLineItemSchema>

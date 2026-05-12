import { z } from 'zod'

const promotionItemSchema = z
  .object({
    productId: z.string().uuid().optional(),
    serviceId: z.string().uuid().optional(),
    quantity: z.number().int().min(1).default(1),
  })
  .superRefine((item, ctx) => {
    const filled = [item.productId, item.serviceId].filter(Boolean)
    if (filled.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cada item deve referenciar exatamente um produto ou serviço',
      })
    }
  })

export const createPromotionSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  price: z.number().min(0),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  discountValue: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
  items: z.array(promotionItemSchema).default([]),
})

// Usa z.input para preservar defaults como opcionais nos formulários
export type CreatePromotionInput = z.input<typeof createPromotionSchema>

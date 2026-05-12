import { z } from 'zod'

export const deletePromotionSchema = z.object({
  id: z.string().uuid(),
})

export type DeletePromotionInput = z.input<typeof deletePromotionSchema>

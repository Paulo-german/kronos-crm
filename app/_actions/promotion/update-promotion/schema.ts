import { z } from 'zod'
import { createPromotionSchema } from '../create-promotion/schema'

export const updatePromotionSchema = createPromotionSchema.extend({
  id: z.string().uuid(),
})

export type UpdatePromotionInput = z.input<typeof updatePromotionSchema>

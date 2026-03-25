import { z } from 'zod'

export const reorderProductMediaSchema = z.object({
  productId: z.string().uuid(),
  mediaIds: z.array(z.string().uuid()).min(1),
})

export type ReorderProductMediaInput = z.infer<typeof reorderProductMediaSchema>

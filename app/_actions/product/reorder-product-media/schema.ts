import { z } from 'zod'

export const reorderProductMediaSchema = z.object({
  productId: z.string().uuid(),
  mediaIds: z.array(z.string().uuid()).min(1),
})

export interface ReorderProductMediaInput extends z.infer<typeof reorderProductMediaSchema> {}

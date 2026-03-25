import { z } from 'zod'

export const deleteProductMediaSchema = z.object({
  mediaId: z.string().uuid(),
  productId: z.string().uuid(),
})

export type DeleteProductMediaInput = z.infer<typeof deleteProductMediaSchema>

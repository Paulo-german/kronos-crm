import { z } from 'zod'

export const uploadProductMediaSchema = z.object({
  productId: z.string().uuid(),
  file: z.instanceof(File).refine((file) => file.size > 0, 'Arquivo vazio.'),
})

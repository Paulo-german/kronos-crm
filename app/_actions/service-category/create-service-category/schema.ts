import { z } from 'zod'

export const createServiceCategorySchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres'),
  isActive: z.boolean().default(true),
})

export type CreateServiceCategoryInput = z.infer<typeof createServiceCategorySchema>

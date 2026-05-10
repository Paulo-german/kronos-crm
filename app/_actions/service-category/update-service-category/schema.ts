import { z } from 'zod'

export const updateServiceCategorySchema = z.object({
  id: z.string().uuid('ID inválido'),
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').optional(),
  isActive: z.boolean().optional(),
})

export type UpdateServiceCategoryInput = z.infer<typeof updateServiceCategorySchema>

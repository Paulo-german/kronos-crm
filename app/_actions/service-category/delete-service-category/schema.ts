import { z } from 'zod'

export const deleteServiceCategorySchema = z.object({
  id: z.string().uuid('ID inválido'),
})

export type DeleteServiceCategoryInput = z.infer<typeof deleteServiceCategorySchema>

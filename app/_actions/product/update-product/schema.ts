import { z } from 'zod'

export const updateProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser positivo'),
})

export type UpdateProductInput = z.infer<typeof updateProductSchema>

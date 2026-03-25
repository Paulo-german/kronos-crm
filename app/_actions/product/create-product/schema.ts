import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser positivo'),
  isActive: z.boolean().optional().default(true),
})

// Usa z.input para preservar isActive como opcional nos formulários
// (z.infer/z.output tornaria isActive obrigatório por causa do .default())
export type ProductInput = z.input<typeof productSchema>

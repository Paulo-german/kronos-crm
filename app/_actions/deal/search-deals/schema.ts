import { z } from 'zod'

export const searchDealsSchema = z.object({
  query: z.string().min(3, 'Digite pelo menos 3 caracteres'),
})

export type SearchDealsInput = z.infer<typeof searchDealsSchema>

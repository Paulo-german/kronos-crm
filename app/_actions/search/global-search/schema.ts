import { z } from 'zod'

export const globalSearchSchema = z.object({
  query: z
    .string()
    .min(3, 'Digite pelo menos 3 caracteres')
    .max(100, 'Máximo de 100 caracteres'),
})

export type GlobalSearchInput = z.infer<typeof globalSearchSchema>

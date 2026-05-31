import { z } from 'zod'

export const searchContactsSchema = z.object({
  query: z.string().min(3, 'Digite pelo menos 3 caracteres').max(100),
})

export type SearchContactsInput = z.infer<typeof searchContactsSchema>

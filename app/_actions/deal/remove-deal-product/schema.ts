import { z } from 'zod'

export const removeDealProductSchema = z.object({
  dealProductId: z.string().uuid(),
})

export type RemoveDealProductInput = z.infer<typeof removeDealProductSchema>

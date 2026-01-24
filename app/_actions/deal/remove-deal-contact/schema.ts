import { z } from 'zod'

export const removeDealContactSchema = z.object({
  dealId: z.string().uuid(),
  contactId: z.string().uuid(),
})

export type RemoveDealContactInput = z.infer<typeof removeDealContactSchema>

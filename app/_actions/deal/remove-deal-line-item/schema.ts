import { z } from 'zod'

export const removeDealLineItemSchema = z.object({
  lineItemId: z.string().uuid(),
})

export type RemoveDealLineItemInput = z.infer<typeof removeDealLineItemSchema>

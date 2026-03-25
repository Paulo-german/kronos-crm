import { z } from 'zod'

export const toggleReadStatusSchema = z.object({
  conversationId: z.string().uuid(),
})

export type ToggleReadStatusInput = z.infer<typeof toggleReadStatusSchema>

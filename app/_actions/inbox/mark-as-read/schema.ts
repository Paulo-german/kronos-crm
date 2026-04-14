import { z } from 'zod'

export const markAsReadSchema = z.object({
  conversationId: z.string().uuid(),
})

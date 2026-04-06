import { z } from 'zod'

export const retryFailedMessageSchema = z.object({
  messageId: z.string().uuid(),
})

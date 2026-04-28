import { z } from 'zod'

export const disconnectInstagramSchema = z.object({
  inboxId: z.string().uuid(),
})

export type DisconnectInstagramInput = z.infer<typeof disconnectInstagramSchema>

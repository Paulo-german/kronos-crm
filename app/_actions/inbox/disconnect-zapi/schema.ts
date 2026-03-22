import { z } from 'zod'

export const disconnectZApiSchema = z.object({
  inboxId: z.string().uuid(),
})

export type DisconnectZApiInput = z.infer<typeof disconnectZApiSchema>

import { z } from 'zod'

export const disconnectMetaSchema = z.object({
  inboxId: z.string().uuid(),
})

export type DisconnectMetaInput = z.infer<typeof disconnectMetaSchema>

import { z } from 'zod'

export const disconnectMetaSchema = z.object({
  inboxId: z.string().uuid(),
})

export interface DisconnectMetaInput extends z.infer<typeof disconnectMetaSchema> {}

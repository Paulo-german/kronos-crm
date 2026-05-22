import { z } from 'zod'

export const disconnectEvolutionGoInboxSchema = z.object({
  inboxId: z.string().uuid(),
})

export type DisconnectEvolutionGoInboxInput = z.infer<typeof disconnectEvolutionGoInboxSchema>

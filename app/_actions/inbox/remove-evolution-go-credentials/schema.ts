import { z } from 'zod'

export const removeEvolutionGoCredentialsSchema = z.object({
  inboxId: z.string().uuid(),
})

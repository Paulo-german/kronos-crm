import { z } from 'zod'

export const testEvolutionGoConnectionSchema = z.object({
  inboxId: z.string().uuid(),
})

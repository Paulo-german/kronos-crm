import { z } from 'zod'

export const startEvolutionGoConnectionSchema = z.object({
  inboxId: z.string().uuid(),
})

export type StartEvolutionGoConnectionInput = z.infer<typeof startEvolutionGoConnectionSchema>

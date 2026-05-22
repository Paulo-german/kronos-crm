import { z } from 'zod'

export const syncEvolutionGoStatusSchema = z.object({
  inboxId: z.string().uuid(),
})

export type SyncEvolutionGoStatusInput = z.infer<typeof syncEvolutionGoStatusSchema>

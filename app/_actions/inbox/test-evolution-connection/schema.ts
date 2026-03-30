import { z } from 'zod'

export const testEvolutionConnectionSchema = z.object({
  inboxId: z.string().uuid(),
})

export type TestEvolutionConnectionInput = z.infer<typeof testEvolutionConnectionSchema>

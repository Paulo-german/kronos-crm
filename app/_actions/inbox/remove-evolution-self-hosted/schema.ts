import { z } from 'zod'

export const removeEvolutionSelfHostedSchema = z.object({
  inboxId: z.string().uuid(),
})

export type RemoveEvolutionSelfHostedInput = z.infer<typeof removeEvolutionSelfHostedSchema>

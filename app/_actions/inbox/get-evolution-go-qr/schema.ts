import { z } from 'zod'

export const getEvolutionGoQrSchema = z.object({
  inboxId: z.string().uuid(),
})

export type GetEvolutionGoQrInput = z.infer<typeof getEvolutionGoQrSchema>

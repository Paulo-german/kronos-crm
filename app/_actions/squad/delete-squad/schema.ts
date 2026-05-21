import { z } from 'zod'

export const deleteSquadSchema = z.object({
  id: z.string().uuid(),
})

export type DeleteSquadInput = z.infer<typeof deleteSquadSchema>

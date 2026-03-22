import { z } from 'zod'

export const deleteFollowUpSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
})

export type DeleteFollowUpInput = z.infer<typeof deleteFollowUpSchema>

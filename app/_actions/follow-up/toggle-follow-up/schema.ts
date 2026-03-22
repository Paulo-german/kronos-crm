import { z } from 'zod'

export const toggleFollowUpSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  isActive: z.boolean(),
})

export type ToggleFollowUpInput = z.infer<typeof toggleFollowUpSchema>

import { z } from 'zod'

export const reorderFollowUpsSchema = z.object({
  agentId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1),
})

export type ReorderFollowUpsInput = z.infer<typeof reorderFollowUpsSchema>

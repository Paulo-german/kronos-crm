import { z } from 'zod'

export const reorderStepsSchema = z.object({
  agentId: z.string().uuid(),
  stepIds: z.array(z.string().uuid()).min(1),
})

export type ReorderStepsInput = z.infer<typeof reorderStepsSchema>

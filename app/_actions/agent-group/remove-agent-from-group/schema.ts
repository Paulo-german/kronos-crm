import { z } from 'zod'

export const removeAgentFromGroupSchema = z.object({
  memberId: z.string().uuid(),
})

export type RemoveAgentFromGroupInput = z.infer<typeof removeAgentFromGroupSchema>

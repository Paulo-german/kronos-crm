import { z } from 'zod'

export const deleteAgentGroupSchema = z.object({
  groupId: z.string().uuid(),
})

export type DeleteAgentGroupInput = z.infer<typeof deleteAgentGroupSchema>

import { z } from 'zod'

export const updateAgentModeSchema = z.object({
  agentId: z.string().uuid(),
  agentMode: z.enum(['PIPELINE', 'BOOKING']),
})

export type UpdateAgentModeInput = z.infer<typeof updateAgentModeSchema>

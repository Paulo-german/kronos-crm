import { z } from 'zod'

export const updateAgentModeSchema = z.object({
  agentId: z.string().uuid(),
  agentMode: z.enum(['PRODUCT', 'SERVICE', 'HYBRID']),
})

export type UpdateAgentModeInput = z.infer<typeof updateAgentModeSchema>

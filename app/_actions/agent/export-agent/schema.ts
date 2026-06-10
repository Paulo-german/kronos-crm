import { z } from 'zod'

export const exportAgentSchema = z.object({
  agentId: z.string().uuid(),
})

export type ExportAgentInput = z.infer<typeof exportAgentSchema>

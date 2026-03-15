import { z } from 'zod'

export const resetTestChatSchema = z.object({
  agentId: z.string().uuid(),
})

import { z } from 'zod'

export const migrateStepToolsToGlobalSchema = z.object({
  agentId: z.string().uuid(),
})

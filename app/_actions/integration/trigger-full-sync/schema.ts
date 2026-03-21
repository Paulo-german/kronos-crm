import { z } from 'zod'

export const triggerFullSyncSchema = z.object({
  integrationId: z.string().uuid(),
})

export type TriggerFullSyncInput = z.infer<typeof triggerFullSyncSchema>

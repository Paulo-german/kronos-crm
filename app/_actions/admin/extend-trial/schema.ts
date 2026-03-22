import { z } from 'zod'

export const extendTrialSchema = z.object({
  organizationId: z.string().uuid(),
  days: z.number().int().min(1).max(365),
})

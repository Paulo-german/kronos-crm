import { z } from 'zod'

export const adminResetOrgCreditsSchema = z.object({
  organizationId: z.string().uuid(),
})

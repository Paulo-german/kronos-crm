import { z } from 'zod'

export const updatePlanLimitsSchema = z.object({
  limits: z.array(
    z.object({
      planId: z.string().uuid(),
      featureKey: z.string().min(1),
      valueNumber: z.number().int().min(0),
    }),
  ),
})

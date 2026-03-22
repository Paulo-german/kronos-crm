import { z } from 'zod'

export const upsertPlanSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50),
  description: z.string().max(500).optional().default(''),
  stripeProductId: z.string().max(100).optional().default(''),
  isActive: z.boolean(),
  moduleIds: z.array(z.string().uuid()),
  limits: z.array(
    z.object({
      featureKey: z.string().min(1),
      valueNumber: z.number().int().min(0),
    }),
  ),
})

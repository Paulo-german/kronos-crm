import { z } from 'zod'

export const deleteFeatureSchema = z.object({
  featureId: z.string().uuid(),
})

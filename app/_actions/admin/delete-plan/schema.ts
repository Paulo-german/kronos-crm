import { z } from 'zod'

export const deletePlanSchema = z.object({
  planId: z.string().uuid(),
})

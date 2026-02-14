import { z } from 'zod'

export const updateLostReasonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).optional(),
  isActive: z.boolean().optional(),
})

export type UpdateLostReasonInput = z.infer<typeof updateLostReasonSchema>

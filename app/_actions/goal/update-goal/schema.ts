import { z } from 'zod'

export const updateGoalSchema = z.object({
  id: z.string().uuid(),
  targetValue: z.coerce.number().positive('Meta deve ser maior que zero.').optional(),
  period: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
})

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>

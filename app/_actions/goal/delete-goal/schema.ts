import { z } from 'zod'

export const deleteGoalSchema = z.object({ id: z.string().uuid() })

export type DeleteGoalInput = z.infer<typeof deleteGoalSchema>

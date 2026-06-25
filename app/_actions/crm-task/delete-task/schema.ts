import { z } from 'zod'

export const deleteTaskSchema = z.object({
  id: z.string().uuid(),
})

export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>

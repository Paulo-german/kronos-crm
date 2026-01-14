import { z } from 'zod'

export const toggleTaskSchema = z.object({
  taskId: z.string().uuid(),
})

export type ToggleTaskInput = z.infer<typeof toggleTaskSchema>

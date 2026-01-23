import { z } from 'zod'

export const toggleTaskStatusSchema = z.object({
  id: z.string().uuid(),
})

export type ToggleTaskStatusInput = z.infer<typeof toggleTaskStatusSchema>

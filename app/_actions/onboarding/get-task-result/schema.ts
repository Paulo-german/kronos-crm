import { z } from 'zod'

export const getTaskResultSchema = z.object({
  taskId: z.string().min(1),
})

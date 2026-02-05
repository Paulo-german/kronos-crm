import { z } from 'zod'

export const bulkDeleteTasksSchema = z.object({
  ids: z.array(z.string()),
})

export type BulkDeleteTasksSchema = z.infer<typeof bulkDeleteTasksSchema>

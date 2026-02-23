import { z } from 'zod'

export const bulkDeleteDealsSchema = z.object({
  ids: z.array(z.string()),
})

export type BulkDeleteDealsSchema = z.infer<typeof bulkDeleteDealsSchema>

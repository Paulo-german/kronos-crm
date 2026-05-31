import { z } from 'zod'

export const bulkDeleteContactsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
})

export type BulkDeleteContactsSchema = z.infer<typeof bulkDeleteContactsSchema>

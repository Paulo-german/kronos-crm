import { z } from 'zod'

export const bulkDeleteContactsSchema = z.object({
  ids: z.array(z.string()),
})

export type BulkDeleteContactsSchema = z.infer<typeof bulkDeleteContactsSchema>

import { z } from 'zod'

export const bulkDeleteProductsSchema = z.object({
  ids: z.array(z.string()),
})

export type BulkDeleteProductsSchema = z.infer<typeof bulkDeleteProductsSchema>

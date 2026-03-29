import { z } from 'zod'

export const bulkDeleteAutomationsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma automação').max(50),
})

export type BulkDeleteAutomationsInput = z.infer<typeof bulkDeleteAutomationsSchema>

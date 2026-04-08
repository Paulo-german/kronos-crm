import { z } from 'zod'

export const deleteChangelogEntrySchema = z.object({
  entryId: z.string().uuid('ID de entrada inválido'),
})

export type DeleteChangelogEntryInput = z.infer<typeof deleteChangelogEntrySchema>

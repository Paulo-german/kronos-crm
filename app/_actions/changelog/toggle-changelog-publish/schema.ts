import { z } from 'zod'

export const toggleChangelogPublishSchema = z.object({
  entryId: z.string().uuid('ID de entrada inválido'),
  isPublished: z.boolean(),
})

export type ToggleChangelogPublishInput = z.infer<typeof toggleChangelogPublishSchema>

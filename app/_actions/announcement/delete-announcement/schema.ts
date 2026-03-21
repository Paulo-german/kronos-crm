import { z } from 'zod'

export const deleteAnnouncementSchema = z.object({
  announcementId: z.string().uuid('ID inválido'),
})

export type DeleteAnnouncementInput = z.infer<typeof deleteAnnouncementSchema>

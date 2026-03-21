import { z } from 'zod'

export const markAsReadSchema = z.object({
  notificationId: z.string().uuid('ID de notificação inválido'),
})

export type MarkAsReadInput = z.infer<typeof markAsReadSchema>

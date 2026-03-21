import { z } from 'zod'

export const deleteNotificationSchema = z.object({
  notificationId: z.string().uuid('ID de notificação inválido'),
})

export type DeleteNotificationInput = z.infer<typeof deleteNotificationSchema>

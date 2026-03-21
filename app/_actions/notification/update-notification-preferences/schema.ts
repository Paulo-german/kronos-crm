import { z } from 'zod'

const channelPreferencesSchema = z.object({
  system: z.boolean(),
  userAction: z.boolean(),
  platformAnnouncement: z.boolean(),
})

export const notificationPreferencesSchema = z.object({
  inApp: channelPreferencesSchema,
})

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>

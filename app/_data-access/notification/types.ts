import { z } from 'zod'
import type { NotificationType } from '@prisma/client'

export interface NotificationDto {
  id: string
  type: NotificationType
  title: string
  body: string
  actionUrl: string | null
  resourceType: string | null
  resourceId: string | null
  readAt: Date | null
  createdAt: Date
}

export interface UnreadCountDto {
  count: number
}

const channelPreferencesSchema = z.object({
  system: z.boolean(),
  userAction: z.boolean(),
  platformAnnouncement: z.boolean(),
})

export const notificationPreferencesSchema = z.object({
  inApp: channelPreferencesSchema,
})

export interface NotificationPreferences {
  inApp: {
    system: boolean
    userAction: boolean
    platformAnnouncement: boolean
  }
}

// Valores padrão quando o campo JSON for null (todas as notificacoes ativas)
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inApp: {
    system: true,
    userAction: true,
    platformAnnouncement: true,
  },
}

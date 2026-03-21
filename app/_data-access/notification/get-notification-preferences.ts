import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import {
  notificationPreferencesSchema,
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from './types'

const fetchNotificationPreferencesFromDb = async (
  userId: string,
): Promise<NotificationPreferences> => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  })

  if (!user?.notificationPreferences) {
    return DEFAULT_NOTIFICATION_PREFERENCES
  }

  // Parse com Zod para garantir shape correto (defensivo contra JSON corrompido)
  const parsed = notificationPreferencesSchema.safeParse(user.notificationPreferences)
  if (!parsed.success) {
    return DEFAULT_NOTIFICATION_PREFERENCES
  }

  return parsed.data
}

/**
 * Retorna as preferencias de notificacao do usuario.
 * Cache longo (1h) pois preferencias mudam raramente.
 * Invalidada por: updateNotificationPreferences.
 */
export const getNotificationPreferences = async (
  userId: string,
): Promise<NotificationPreferences> => {
  const getCached = unstable_cache(
    async () => fetchNotificationPreferencesFromDb(userId),
    [`notification-preferences-${userId}`],
    {
      tags: [`notification-preferences:${userId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}

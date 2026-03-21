import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { NotificationDto } from './types'

const RECENT_LIMIT = 10

const fetchRecentNotificationsFromDb = async (
  userId: string,
  orgId: string,
): Promise<NotificationDto[]> => {
  return db.notification.findMany({
    where: {
      userId,
      organizationId: orgId,
    },
    orderBy: { createdAt: 'desc' },
    take: RECENT_LIMIT,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      actionUrl: true,
      resourceType: true,
      resourceId: true,
      readAt: true,
      createdAt: true,
    },
  })
}

/**
 * Busca as 10 notificacoes mais recentes do usuario para o popover do bell icon.
 * Cache curto (30s) alinhado com o TTL do unread count.
 * Invalidada por: markAsRead, markAllAsRead, deleteNotification, createNotification.
 */
export const getRecentNotifications = async (
  userId: string,
  orgId: string,
): Promise<NotificationDto[]> => {
  const getCached = unstable_cache(
    async () => fetchRecentNotificationsFromDb(userId, orgId),
    [`notifications-recent-${userId}-${orgId}`],
    {
      tags: [`notifications:${userId}`],
      revalidate: 30,
    },
  )

  return getCached()
}

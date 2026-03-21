import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { NotificationDto } from './types'

interface FetchNotificationsOptions {
  limit: number
  offset: number
}

const fetchNotificationsFromDb = async (
  userId: string,
  orgId: string,
  options: FetchNotificationsOptions,
): Promise<NotificationDto[]> => {
  return db.notification.findMany({
    where: {
      userId,
      organizationId: orgId,
    },
    orderBy: { createdAt: 'desc' },
    take: options.limit,
    skip: options.offset,
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
 * Busca lista paginada de notificacoes do usuario na org.
 * Usada na pagina completa de historico de notificacoes.
 * Invalidada por: markAsRead, markAllAsRead, deleteNotification, createNotification.
 */
export const getNotifications = async (
  userId: string,
  orgId: string,
  options: FetchNotificationsOptions = { limit: 20, offset: 0 },
): Promise<NotificationDto[]> => {
  const getCached = unstable_cache(
    async () => fetchNotificationsFromDb(userId, orgId, options),
    [`notifications-${userId}-${orgId}-${options.limit}-${options.offset}`],
    {
      tags: [`notifications:${userId}`],
      revalidate: 60,
    },
  )

  return getCached()
}

import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

const fetchUnreadCount = async (userId: string, orgId: string): Promise<number> => {
  return db.notification.count({
    where: {
      userId,
      organizationId: orgId,
      readAt: null,
    },
  })
}

/**
 * Retorna o total de notificacoes nao lidas do usuario na org.
 * Cache curto (30s) para complementar o polling do client.
 * Invalidado por: markAsRead, markAllAsRead, deleteNotification, createNotification.
 */
export const getUnreadNotificationCount = async (
  userId: string,
  orgId: string,
): Promise<number> => {
  const getCached = unstable_cache(
    async () => fetchUnreadCount(userId, orgId),
    [`notification-unread-count-${userId}-${orgId}`],
    {
      tags: [`notifications:${userId}`],
      revalidate: 30,
    },
  )

  return getCached()
}

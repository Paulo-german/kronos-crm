import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { NotificationDto } from './types'

const RECENT_LIMIT = 10

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  body: true,
  actionUrl: true,
  resourceType: true,
  resourceId: true,
  readAt: true,
  createdAt: true,
} as const

/**
 * Busca os IDs das orgs onde o email tem convite PENDING.
 * Retorno vazio significa que nao ha convites pendentes.
 */
const findPendingInviteOrgIds = async (email: string): Promise<string[]> => {
  const pendingMembers = await db.member.findMany({
    where: { email, status: 'PENDING' },
    select: { organizationId: true },
  })

  return pendingMembers.map((member) => member.organizationId)
}

const fetchPendingInviteNotificationsFromDb = async (
  userId: string,
  email: string,
): Promise<NotificationDto[]> => {
  const orgIds = await findPendingInviteOrgIds(email)
  if (orgIds.length === 0) return []

  return db.notification.findMany({
    where: {
      userId,
      organizationId: { in: orgIds },
    },
    orderBy: { createdAt: 'desc' },
    take: RECENT_LIMIT,
    select: NOTIFICATION_SELECT,
  })
}

const fetchPendingInviteUnreadCountFromDb = async (
  userId: string,
  email: string,
): Promise<number> => {
  const orgIds = await findPendingInviteOrgIds(email)
  if (orgIds.length === 0) return 0

  return db.notification.count({
    where: {
      userId,
      organizationId: { in: orgIds },
      readAt: null,
    },
  })
}

/**
 * Busca notificacoes de orgs onde o usuario tem convite PENDING.
 * Permite que o usuario veja notificacoes de convite mesmo estando em outra org.
 * Cache tag compartilhada com notifications gerais para invalidacao automatica.
 */
export const getPendingInviteNotifications = async (
  userId: string,
  email: string,
): Promise<NotificationDto[]> => {
  const getCached = unstable_cache(
    async () => fetchPendingInviteNotificationsFromDb(userId, email),
    [`pending-invite-notifications-${userId}`],
    {
      tags: [`notifications:${userId}`],
      revalidate: 30,
    },
  )

  return getCached()
}

/**
 * Conta notificacoes nao lidas de orgs onde o usuario tem convite PENDING.
 */
export const getPendingInviteUnreadCount = async (
  userId: string,
  email: string,
): Promise<number> => {
  const getCached = unstable_cache(
    async () => fetchPendingInviteUnreadCountFromDb(userId, email),
    [`pending-invite-unread-count-${userId}`],
    {
      tags: [`notifications:${userId}`],
      revalidate: 30,
    },
  )

  return getCached()
}

import 'server-only'
import { db } from '@/_lib/prisma'
import type { AdminStatsDto } from './types'

export async function getAdminStats(): Promise<AdminStatsDto> {
  const [totalOrganizations, totalUsers, activeSubscriptions, totalAnnouncements] =
    await Promise.all([
      db.organization.count({
        where: {
          members: { some: { status: 'ACCEPTED' } },
        },
      }),
      db.user.count(),
      db.subscription.count({
        where: { status: 'active' },
      }),
      db.announcement.count(),
    ])

  return {
    totalOrganizations,
    totalUsers,
    activeSubscriptions,
    totalAnnouncements,
  }
}

import 'server-only'
import { db } from '@/_lib/prisma'
import type { AnnouncementDto } from './types'

/**
 * Lista todos os comunicados ordenados por data de criação (mais recente primeiro).
 * Sem cache: painel admin de baixo volume, dados devem estar sempre frescos.
 */
export async function getAnnouncements(): Promise<AnnouncementDto[]> {
  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      body: true,
      actionUrl: true,
      targetOrgIds: true,
      createdBy: true,
      createdByUser: {
        select: {
          fullName: true,
          email: true,
        },
      },
      totalRecipients: true,
      createdAt: true,
    },
  })

  return announcements
}

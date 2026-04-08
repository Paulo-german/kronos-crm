import 'server-only'
import { db } from '@/_lib/prisma'
import type { ChangelogEntryAdminDto } from './types'

/**
 * Lista todas as entradas do changelog (publicadas e rascunhos), ordenadas
 * por data de criação descrescente.
 * Sem cache: painel admin de baixo volume, dados devem estar sempre frescos.
 */
export async function getChangelogEntriesAdmin(): Promise<ChangelogEntryAdminDto[]> {
  const entries = await db.changelogEntry.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      isPublished: true,
      publishedAt: true,
      createdBy: true,
      createdByUser: {
        select: {
          fullName: true,
          email: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  })

  return entries
}

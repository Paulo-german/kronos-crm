import 'server-only'
import { db } from '@/_lib/prisma'
import type { ChangelogEntryAdminDto } from './types'

/**
 * Retorna uma entrada do changelog pelo ID para a página de edição do admin.
 * Sem cache: dados do formulário de edição devem estar sempre frescos.
 */
export async function getChangelogEntryById(id: string): Promise<ChangelogEntryAdminDto | null> {
  const entry = await db.changelogEntry.findUnique({
    where: { id },
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

  return entry
}

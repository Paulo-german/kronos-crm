'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { toggleChangelogPublishSchema } from './schema'

export const toggleChangelogPublish = superAdminActionClient
  .schema(toggleChangelogPublishSchema)
  .action(async ({ parsedInput: data }) => {
    const existing = await db.changelogEntry.findUnique({
      where: { id: data.entryId },
      select: { isPublished: true, publishedAt: true },
    })

    if (!existing) {
      throw new Error('Entrada do changelog não encontrada.')
    }

    // Mesma lógica de preservação do publishedAt do upsert:
    // - publicando pela primeira vez: seta agora
    // - despublicando: nullifica
    // - re-publicando após edição que manteve publicação: não deve ocorrer via toggle,
    //   mas se ocorrer (bug de estado), seta nova data para consistência
    let publishedAt: Date | null

    if (data.isPublished) {
      publishedAt = existing.publishedAt ?? new Date()
    } else {
      publishedAt = null
    }

    await db.changelogEntry.update({
      where: { id: data.entryId },
      data: {
        isPublished: data.isPublished,
        publishedAt,
      },
    })

    revalidateTag('changelog:public')
    revalidatePath('/admin/changelog')

    return { success: true }
  })

'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { upsertChangelogEntrySchema } from './schema'

export const upsertChangelogEntry = superAdminActionClient
  .schema(upsertChangelogEntrySchema)
  .action(async ({ parsedInput: data, ctx }) => {
    if (data.id) {
      const entryId = data.id

      const existing = await db.changelogEntry.findUnique({
        where: { id: entryId },
        select: { isPublished: true, publishedAt: true },
      })

      if (!existing) {
        throw new Error('Entrada do changelog não encontrada.')
      }

      // Lógica de preservação do publishedAt:
      // - rascunho → publicado: seta publishedAt agora
      // - publicado → despublicado: nullifica publishedAt
      // - publicado → continua publicado: preserva a data original
      let publishedAt: Date | null

      if (data.isPublished && existing.isPublished && existing.publishedAt) {
        publishedAt = existing.publishedAt
      } else if (data.isPublished && !existing.isPublished) {
        publishedAt = new Date()
      } else {
        publishedAt = null
      }

      const updated = await db.changelogEntry.update({
        where: { id: entryId },
        data: {
          title: data.title,
          description: data.description,
          type: data.type,
          isPublished: data.isPublished,
          publishedAt,
        },
        select: { id: true },
      })

      revalidateTag('changelog:public')
      revalidatePath('/admin/changelog')

      return { success: true, entryId: updated.id }
    }

    // Create: publishedAt preenchido apenas se já publicando na criação
    const publishedAt = data.isPublished ? new Date() : null

    const created = await db.changelogEntry.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        isPublished: data.isPublished,
        publishedAt,
        createdBy: ctx.userId,
      },
      select: { id: true },
    })

    revalidateTag('changelog:public')
    revalidatePath('/admin/changelog')

    return { success: true, entryId: created.id }
  })

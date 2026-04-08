'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { deleteChangelogEntrySchema } from './schema'

export const deleteChangelogEntry = superAdminActionClient
  .schema(deleteChangelogEntrySchema)
  .action(async ({ parsedInput: data }) => {
    const existing = await db.changelogEntry.findUnique({
      where: { id: data.entryId },
      select: { id: true },
    })

    if (!existing) {
      throw new Error('Entrada do changelog não encontrada.')
    }

    await db.changelogEntry.delete({
      where: { id: data.entryId },
    })

    revalidateTag('changelog:public')
    revalidatePath('/admin/changelog')

    return { success: true }
  })

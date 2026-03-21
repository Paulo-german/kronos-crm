'use server'

import { superAdminActionClient } from '@/_lib/safe-action'
import { deleteAnnouncementSchema } from './schema'
import { db } from '@/_lib/prisma'

export const deleteAnnouncement = superAdminActionClient
  .schema(deleteAnnouncementSchema)
  .action(async ({ parsedInput: { announcementId } }) => {
    // Verificar se o comunicado existe antes de deletar
    const existing = await db.announcement.findUnique({
      where: { id: announcementId },
      select: { id: true },
    })

    if (!existing) {
      throw new Error('Comunicado não encontrado.')
    }

    // Deletar o registro — notificações já entregues permanecem intactas
    await db.announcement.delete({
      where: { id: announcementId },
    })

    return { success: true }
  })

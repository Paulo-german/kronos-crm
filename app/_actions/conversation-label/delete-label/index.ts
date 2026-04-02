'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { deleteLabelSchema } from './schema'

export const deleteLabel = orgActionClient
  .schema(deleteLabelSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verificar que a etiqueta pertence à organização
    const label = await db.conversationLabel.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
    })

    if (!label) {
      throw new Error('Etiqueta não encontrada.')
    }

    // Cascade remove os assignments automaticamente (onDelete: Cascade no schema)
    await db.conversationLabel.delete({
      where: { id: data.id },
    })

    // Invalida lista de labels e conversas (assignments são removidos em cascade)
    revalidateTag(`conversation-labels:${ctx.orgId}`)
    revalidateTag(`conversations:${ctx.orgId}`)

    return { success: true }
  })

'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { updateLabelSchema } from './schema'

export const updateLabel = orgActionClient
  .schema(updateLabelSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verificar que a etiqueta pertence à organização
    const label = await db.conversationLabel.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
    })

    if (!label) {
      throw new Error('Etiqueta não encontrada.')
    }

    // Se o nome mudou, verificar unicidade dentro da organização
    if (data.name && data.name !== label.name) {
      const duplicate = await db.conversationLabel.findFirst({
        where: { organizationId: ctx.orgId, name: data.name, id: { not: data.id } },
      })

      if (duplicate) {
        throw new Error('Já existe uma etiqueta com este nome.')
      }
    }

    await db.conversationLabel.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
      },
    })

    // Invalida lista de labels e conversas (labels são exibidos no conversation list)
    revalidateTag(`conversation-labels:${ctx.orgId}`)
    revalidateTag(`conversations:${ctx.orgId}`)

    return { success: true }
  })

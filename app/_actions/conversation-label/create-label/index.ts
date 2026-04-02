'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { createLabelSchema } from './schema'

export const createLabel = orgActionClient
  .schema(createLabelSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verificar unicidade de nome dentro da organização antes de criar
    const existing = await db.conversationLabel.findFirst({
      where: { organizationId: ctx.orgId, name: data.name },
    })

    if (existing) {
      throw new Error('Já existe uma etiqueta com este nome.')
    }

    const label = await db.conversationLabel.create({
      data: {
        organizationId: ctx.orgId,
        name: data.name,
        color: data.color,
      },
    })

    revalidateTag(`conversation-labels:${ctx.orgId}`)

    return { success: true, labelId: label.id }
  })

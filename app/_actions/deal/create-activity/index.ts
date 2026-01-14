'use server'

import { authActionClient } from '@/_lib/safe-action'
import { createActivitySchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const createActivity = authActionClient
  .schema(createActivitySchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica ownership do deal
    const deal = await db.deal.findFirst({
      where: {
        id: data.dealId,
        stage: {
          pipeline: {
            createdBy: ctx.userId,
          },
        },
      },
    })

    if (!deal) {
      throw new Error('Deal não encontrado ou não pertence a você.')
    }

    // Cria a atividade
    await db.activity.create({
      data: {
        type: data.type,
        content: data.content,
        dealId: data.dealId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${data.dealId}`)

    return { success: true }
  })

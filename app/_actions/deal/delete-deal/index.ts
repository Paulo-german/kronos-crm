'use server'

import { authActionClient } from '@/_lib/safe-action'
import { deleteDealSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'

export const deleteDeal = authActionClient
  .schema(deleteDealSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica ownership do deal (via stage -> pipeline)
    const deal = await db.deal.findFirst({
      where: {
        id: data.id,
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

    await db.deal.delete({
      where: { id: data.id },
    })

    revalidatePath('/pipeline')
    revalidateTag(`pipeline:${ctx.userId}`)

    return { success: true }
  })

'use server'

import { authActionClient } from '@/_lib/safe-action'
import { updateDealPrioritySchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const updateDealPriority = authActionClient
  .schema(updateDealPrioritySchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica ownership via pipeline
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

    await db.deal.update({
      where: { id: data.dealId },
      data: {
        priority: data.priority,
      },
    })

    revalidatePath('/pipeline')

    return { success: true }
  })

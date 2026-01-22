'use server'

import { authActionClient } from '@/_lib/safe-action'
import { markDealLostSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'
import { ActivityType } from '@prisma/client'

export const markDealLost = authActionClient
  .schema(markDealLostSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Busca deal e valida ownership
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

    // Atualiza status do deal para LOST
    await db.deal.update({
      where: { id: data.dealId },
      data: { status: 'LOST' },
    })

    // Registra atividade
    await db.activity.create({
      data: {
        type: ActivityType.deal_lost,
        content: 'Deal marcado como PERDIDO',
        dealId: data.dealId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${data.dealId}`)

    return { success: true }
  })

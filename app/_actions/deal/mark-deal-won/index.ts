'use server'

import { authActionClient } from '@/_lib/safe-action'
import { markDealWonSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'
import { ActivityType } from '@prisma/client'

export const markDealWon = authActionClient
  .schema(markDealWonSchema)
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

    // Atualiza status do deal para WON
    await db.deal.update({
      where: { id: data.dealId },
      data: { status: 'WON' },
    })

    // Registra atividade
    await db.activity.create({
      data: {
        type: ActivityType.deal_won,
        content: 'Deal marcado como GANHO 🎉',
        dealId: data.dealId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${data.dealId}`)

    return { success: true }
  })

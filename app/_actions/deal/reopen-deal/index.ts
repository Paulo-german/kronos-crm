'use server'

import { authActionClient } from '@/_lib/safe-action'
import { reopenDealSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'
import { ActivityType } from '@prisma/client'

export const reopenDeal = authActionClient
  .schema(reopenDealSchema)
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

    // Atualiza status do deal para OPEN
    await db.deal.update({
      where: { id: data.dealId },
      data: { status: 'OPEN' },
    })

    // Registra atividade
    // Como não temos um tipo específico para reabertura, usamos stage_change
    // ou poderíamos criar um novo, mas vamos usar stage_change por enquanto
    // já que tecnicamente estamos mudando o status/estágio lógico.
    await db.activity.create({
      data: {
        type: ActivityType.deal_reopened,
        content: 'Negociação retomada (Status: ABERTO)',
        dealId: data.dealId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${data.dealId}`)

    return { success: true }
  })

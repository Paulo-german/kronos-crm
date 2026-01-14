'use server'

import { authActionClient } from '@/_lib/safe-action'
import { markDealWonSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const markDealWon = authActionClient
  .schema(markDealWonSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Busca deal e pipeline
    const deal = await db.deal.findFirst({
      where: {
        id: data.dealId,
        stage: {
          pipeline: {
            createdBy: ctx.userId,
          },
        },
      },
      include: {
        stage: {
          include: {
            pipeline: true,
          },
        },
      },
    })

    if (!deal) {
      throw new Error('Deal não encontrado ou não pertence a você.')
    }

    const pipeline = deal.stage.pipeline

    if (!pipeline.wonStageId) {
      throw new Error('Nenhuma etapa de ganho configurada no pipeline.')
    }

    // Move deal para etapa de ganho
    await db.deal.update({
      where: { id: data.dealId },
      data: {
        pipelineStageId: pipeline.wonStageId,
      },
    })

    // Registra atividade
    await db.activity.create({
      data: {
        type: 'stage_change',
        content: 'Deal marcado como GANHO 🎉',
        dealId: data.dealId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${data.dealId}`)

    return { success: true }
  })

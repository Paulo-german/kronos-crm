'use server'

import { authActionClient } from '@/_lib/safe-action'
import { moveDealToStageSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'

export const moveDealToStage = authActionClient
  .schema(moveDealToStageSchema)
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

    // Verifica se a nova etapa pertence ao mesmo pipeline
    const newStage = await db.pipelineStage.findFirst({
      where: {
        id: data.stageId,
        pipelineId: deal.stage.pipelineId,
      },
    })

    if (!newStage) {
      throw new Error('Etapa não pertence a este pipeline.')
    }

    // Se já está na mesma etapa, não faz nada
    if (deal.pipelineStageId === data.stageId) {
      return { success: true, moved: false }
    }

    await db.deal.update({
      where: { id: data.dealId },
      data: { pipelineStageId: data.stageId },
    })

    // Registra atividade de mudança de etapa
    await db.activity.create({
      data: {
        type: 'stage_change',
        content: `${deal.stage.name} → ${newStage.name}`,
        dealId: data.dealId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${data.dealId}`)
    revalidateTag(`pipeline:${ctx.userId}`)

    return { success: true, moved: true }
  })

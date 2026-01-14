'use server'

import { authActionClient } from '@/_lib/safe-action'
import { setWonLostStagesSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const setWonLostStages = authActionClient
  .schema(setWonLostStagesSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica ownership do pipeline
    const pipeline = await db.pipeline.findFirst({
      where: {
        id: data.pipelineId,
        createdBy: ctx.userId,
      },
    })

    if (!pipeline) {
      throw new Error('Pipeline não encontrado ou não pertence a você.')
    }

    // Valida que as etapas pertencem ao pipeline
    if (data.wonStageId) {
      const wonStage = await db.pipelineStage.findFirst({
        where: {
          id: data.wonStageId,
          pipelineId: data.pipelineId,
        },
      })
      if (!wonStage) {
        throw new Error('Etapa de ganho não pertence a este pipeline.')
      }
    }

    if (data.lostStageId) {
      const lostStage = await db.pipelineStage.findFirst({
        where: {
          id: data.lostStageId,
          pipelineId: data.pipelineId,
        },
      })
      if (!lostStage) {
        throw new Error('Etapa de perda não pertence a este pipeline.')
      }
    }

    // Não permite mesma etapa para ganho e perda
    if (data.wonStageId && data.wonStageId === data.lostStageId) {
      throw new Error('A etapa de ganho e perda não podem ser a mesma.')
    }

    await db.pipeline.update({
      where: { id: data.pipelineId },
      data: {
        wonStageId: data.wonStageId,
        lostStageId: data.lostStageId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath('/pipeline/settings')

    return { success: true }
  })

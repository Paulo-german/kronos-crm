'use server'

import { authActionClient } from '@/_lib/safe-action'
import { createStageSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'

export const createStage = authActionClient
  .schema(createStageSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica ownership do pipeline
    const pipeline = await db.pipeline.findFirst({
      where: {
        id: data.pipelineId,
        createdBy: ctx.userId,
      },
      include: {
        stages: {
          orderBy: { position: 'desc' },
          take: 1,
        },
      },
    })

    if (!pipeline) {
      throw new Error('Pipeline não encontrado ou não pertence a você.')
    }

    // Pega a última posição e adiciona 1
    const lastPosition = pipeline.stages[0]?.position ?? 0
    const newPosition = lastPosition + 1

    const stage = await db.pipelineStage.create({
      data: {
        pipelineId: data.pipelineId,
        name: data.name,
        color: data.color || '#6b7280',
        position: newPosition,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath('/pipeline/settings')
    revalidateTag(`pipeline:${ctx.userId}`)

    return { success: true, stageId: stage.id }
  })

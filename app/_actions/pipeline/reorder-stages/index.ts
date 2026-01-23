'use server'

import { authActionClient } from '@/_lib/safe-action'
import { reorderStagesSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'

export const reorderStages = authActionClient
  .schema(reorderStagesSchema)
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

    // Atualiza posições em batch
    const updates = data.stageIds.map((stageId, index) =>
      db.pipelineStage.update({
        where: { id: stageId },
        data: { position: index + 1 },
      }),
    )

    await db.$transaction(updates)

    revalidatePath('/pipeline')
    revalidatePath('/pipeline/settings')
    revalidateTag(`pipeline:${ctx.userId}`)

    return { success: true }
  })

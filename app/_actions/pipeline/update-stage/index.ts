'use server'

import { authActionClient } from '@/_lib/safe-action'
import { updateStageSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'

export const updateStage = authActionClient
  .schema(updateStageSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica ownership via pipeline
    const stage = await db.pipelineStage.findFirst({
      where: {
        id: data.id,
        pipeline: {
          createdBy: ctx.userId,
        },
      },
    })

    if (!stage) {
      throw new Error('Etapa não encontrada ou não pertence a você.')
    }

    await db.pipelineStage.update({
      where: { id: data.id },
      data: {
        name: data.name,
        color: data.color,
        position: data.position,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath('/pipeline/settings')
    revalidateTag(`pipeline:${ctx.userId}`)

    return { success: true }
  })

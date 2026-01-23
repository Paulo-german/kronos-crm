'use server'

import { authActionClient } from '@/_lib/safe-action'
import { deleteStageSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'

export const deleteStage = authActionClient
  .schema(deleteStageSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica ownership via pipeline
    const stage = await db.pipelineStage.findFirst({
      where: {
        id: data.id,
        pipeline: {
          createdBy: ctx.userId,
        },
      },
      include: {
        _count: {
          select: { deals: true },
        },
        pipeline: true,
      },
    })

    if (!stage) {
      throw new Error('Etapa não encontrada ou não pertence a você.')
    }

    // Bloqueia exclusão se tiver deals
    if (stage._count.deals > 0) {
      throw new Error(
        `Não é possível excluir esta etapa. Ela possui ${stage._count.deals} deal(s) vinculado(s).`,
      )
    }

    await db.pipelineStage.delete({
      where: { id: data.id },
    })

    revalidatePath('/pipeline')
    revalidatePath('/pipeline/settings')
    revalidateTag(`pipeline:${ctx.userId}`)

    return { success: true }
  })

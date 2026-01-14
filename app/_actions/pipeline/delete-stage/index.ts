'use server'

import { authActionClient } from '@/_lib/safe-action'
import { deleteStageSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

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

    // Bloqueia exclusão de etapas especiais (ganho/perda)
    if (
      stage.pipeline.wonStageId === data.id ||
      stage.pipeline.lostStageId === data.id
    ) {
      throw new Error(
        'Não é possível excluir a etapa de Ganho ou Perdido. Altere a configuração do pipeline primeiro.',
      )
    }

    await db.pipelineStage.delete({
      where: { id: data.id },
    })

    revalidatePath('/pipeline')
    revalidatePath('/pipeline/settings')

    return { success: true }
  })

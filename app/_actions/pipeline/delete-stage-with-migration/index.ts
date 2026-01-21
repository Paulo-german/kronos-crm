'use server'

import { authActionClient } from '@/_lib/safe-action'
import { deleteStageWithMigrationSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const deleteStageWithMigration = authActionClient
  .schema(deleteStageWithMigrationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica ownership da etapa que será deletada
    const stage = await db.pipelineStage.findFirst({
      where: {
        id: data.stageId,
        pipeline: {
          createdBy: ctx.userId,
        },
      },
      include: {
        _count: {
          select: { deals: true },
        },
      },
    })

    if (!stage) {
      throw new Error('Etapa não encontrada ou não pertence a você.')
    }

    // Verifica se a etapa de destino existe e pertence ao mesmo pipeline
    const targetStage = await db.pipelineStage.findFirst({
      where: {
        id: data.targetStageId,
        pipelineId: stage.pipelineId,
      },
    })

    if (!targetStage) {
      throw new Error('Etapa de destino inválida.')
    }

    // Não pode migrar para a própria etapa
    if (data.stageId === data.targetStageId) {
      throw new Error('Não é possível mover deals para a mesma etapa.')
    }

    // Move todos os deals para a etapa de destino
    if (stage._count.deals > 0) {
      await db.deal.updateMany({
        where: { pipelineStageId: data.stageId },
        data: { pipelineStageId: data.targetStageId },
      })
    }

    // Deleta a etapa
    await db.pipelineStage.delete({
      where: { id: data.stageId },
    })

    revalidatePath('/pipeline')
    revalidatePath('/pipeline/settings')

    return {
      success: true,
      movedDealsCount: stage._count.deals,
    }
  })

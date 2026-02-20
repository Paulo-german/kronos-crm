'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { deleteStageWithMigrationSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const deleteStageWithMigration = orgActionClient
  .schema(deleteStageWithMigrationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base (apenas ADMIN/OWNER podem gerenciar pipeline)
    requirePermission(canPerformAction(ctx, 'pipeline', 'delete'))

    // 2. Verifica ownership via organização
    const stage = await db.pipelineStage.findFirst({
      where: {
        id: data.stageId,
        pipeline: {
          organizationId: ctx.orgId,
        },
      },
      include: {
        _count: {
          select: { deals: true },
        },
      },
    })

    if (!stage) {
      throw new Error('Etapa não encontrada.')
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

    revalidatePath('/crm/pipeline')
    revalidateTag(`pipeline:${ctx.orgId}`)

    return {
      success: true,
      movedDealsCount: stage._count.deals,
    }
  })

'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { deleteStageSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const deleteStage = orgActionClient
  .schema(deleteStageSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base (apenas ADMIN/OWNER podem gerenciar pipeline)
    requirePermission(canPerformAction(ctx, 'pipeline', 'delete'))

    // 2. Verifica ownership via organização
    const stage = await db.pipelineStage.findFirst({
      where: {
        id: data.id,
        pipeline: {
          organizationId: ctx.orgId,
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
      throw new Error('Etapa não encontrada.')
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

    revalidatePath('/crm/pipeline')
    revalidateTag(`pipeline:${ctx.orgId}`)

    return { success: true }
  })

'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { reorderStagesSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const reorderStages = orgActionClient
  .schema(reorderStagesSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base (apenas ADMIN/OWNER podem gerenciar pipeline)
    requirePermission(canPerformAction(ctx, 'pipeline', 'update'))

    // 2. Verifica ownership via organização
    const pipeline = await db.pipeline.findFirst({
      where: {
        id: data.pipelineId,
        organizationId: ctx.orgId,
      },
    })

    if (!pipeline) {
      throw new Error('Pipeline não encontrado.')
    }

    // Atualiza posições em batch
    const updates = data.stageIds.map((stageId, index) =>
      db.pipelineStage.update({
        where: { id: stageId },
        data: { position: index + 1 },
      }),
    )

    await db.$transaction(updates)

    revalidatePath('/crm/pipeline')
    revalidateTag(`pipeline:${ctx.orgId}`)

    return { success: true }
  })

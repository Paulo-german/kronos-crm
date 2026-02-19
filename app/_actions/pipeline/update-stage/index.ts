'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateStageSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const updateStage = orgActionClient
  .schema(updateStageSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base (apenas ADMIN/OWNER podem gerenciar pipeline)
    requirePermission(canPerformAction(ctx, 'pipeline', 'update'))

    // 2. Verifica ownership via organização
    const stage = await db.pipelineStage.findFirst({
      where: {
        id: data.id,
        pipeline: {
          organizationId: ctx.orgId,
        },
      },
    })

    if (!stage) {
      throw new Error('Etapa não encontrada.')
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
    revalidateTag(`pipeline:${ctx.orgId}`)

    return { success: true }
  })

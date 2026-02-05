'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createStageSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const createStage = orgActionClient
  .schema(createStageSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base (apenas ADMIN/OWNER podem gerenciar pipeline)
    requirePermission(canPerformAction(ctx, 'pipeline', 'create'))

    // 2. Verifica ownership via organização
    const pipeline = await db.pipeline.findFirst({
      where: {
        id: data.pipelineId,
        organizationId: ctx.orgId,
      },
      include: {
        stages: {
          orderBy: { position: 'desc' },
          take: 1,
        },
      },
    })

    if (!pipeline) {
      throw new Error('Pipeline não encontrado.')
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
    revalidateTag(`pipeline:${ctx.orgId}`)

    return { success: true, stageId: stage.id }
  })

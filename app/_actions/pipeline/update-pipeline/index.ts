'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { updatePipelineSchema } from './schema'

export const updatePipeline = orgActionClient
  .schema(updatePipelineSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'pipeline', 'update'))

    // 2. Validar ownership: o pipeline deve pertencer à organização do contexto
    const pipeline = await db.pipeline.findFirst({
      where: { id: data.pipelineId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!pipeline) {
      throw new Error('Pipeline não encontrado.')
    }

    // 3. Atualizar apenas os campos enviados (spread condicional evita sobrescrever com undefined)
    await db.pipeline.update({
      where: { id: data.pipelineId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.showIdleDays !== undefined && { showIdleDays: data.showIdleDays }),
      },
    })

    // 4. Invalidar cache do pipeline e dos deals (showIdleDays afeta a exibição no kanban)
    revalidateTag(`pipeline:${ctx.orgId}`)

    return { success: true }
  })

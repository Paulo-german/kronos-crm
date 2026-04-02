'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { setDefaultPipelineSchema } from './schema'

export const setDefaultPipeline = orgActionClient
  .schema(setDefaultPipelineSchema)
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

    // 3. Transação atômica: remove flag de default de todos, aplica no novo
    //    updateMany não lança erro se não houver pipeline default anterior
    await db.$transaction([
      db.pipeline.updateMany({
        where: { organizationId: ctx.orgId, isDefault: true },
        data: { isDefault: false },
      }),
      db.pipeline.update({
        where: { id: data.pipelineId },
        data: { isDefault: true },
      }),
    ])

    // 4. Invalidar cache para refletir o novo default no seletor e na página de settings
    revalidateTag(`pipeline:${ctx.orgId}`)

    return { success: true }
  })

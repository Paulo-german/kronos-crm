'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

const schema = z.object({
  pipelineId: z.string().uuid(),
  showIdleDays: z.boolean(),
})

export const toggleIdleDays = orgActionClient
  .schema(schema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'pipeline', 'update'))

    await db.pipeline.update({
      where: {
        id: data.pipelineId,
        organizationId: ctx.orgId,
      },
      data: { showIdleDays: data.showIdleDays },
    })

    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)

    return { showIdleDays: data.showIdleDays }
  })

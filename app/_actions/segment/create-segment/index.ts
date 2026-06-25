'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission, requireQuota } from '@/_lib/rbac'
import { createSegmentSchema } from '../schema'

export const createSegment = orgActionClient
  .schema(createSegmentSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: gerência de segmentação é OWNER/ADMIN
    requirePermission(canPerformAction(ctx, 'segment', 'create'))

    // 2. Quota do plano (Light = 0 bloqueia; demais têm limite numérico)
    await requireQuota(ctx.orgId, 'segment')

    const created = await db.contactSegment.create({
      data: {
        organizationId: ctx.orgId,
        name: data.name,
        description: data.description,
        filters: data.filters,
        createdBy: ctx.userId,
      },
      select: { id: true },
    })

    revalidateTag(`segments:${ctx.orgId}`)

    return { success: true, id: created.id }
  })

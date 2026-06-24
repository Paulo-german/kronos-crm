'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { updateSegmentSchema } from '../schema'

export const updateSegment = orgActionClient
  .schema(updateSegmentSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: gerência de segmentação é OWNER/ADMIN
    requirePermission(canPerformAction(ctx, 'segment', 'update'))

    // 2. Ownership da org: segmento precisa existir e pertencer à organização
    const existing = await db.contactSegment.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!existing) {
      throw new Error('Segmentação não encontrada ou sem acesso.')
    }

    await db.contactSegment.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description,
        filters: data.filters,
      },
    })

    revalidateTag(`segments:${ctx.orgId}`)

    return { success: true }
  })

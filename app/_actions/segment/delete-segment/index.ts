'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { deleteSegmentSchema } from '../schema'

export const deleteSegment = orgActionClient
  .schema(deleteSegmentSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: gerência de segmentação é OWNER/ADMIN
    requirePermission(canPerformAction(ctx, 'segment', 'delete'))

    // 2. Ownership da org
    const existing = await db.contactSegment.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!existing) {
      throw new Error('Segmentação não encontrada ou sem acesso.')
    }

    // Disparos passados que referenciam o segmento têm segmentId zerado (SetNull)
    await db.contactSegment.delete({ where: { id: data.id } })

    revalidateTag(`segments:${ctx.orgId}`)

    return { success: true }
  })

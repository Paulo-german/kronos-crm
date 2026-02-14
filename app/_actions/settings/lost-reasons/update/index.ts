'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateLostReasonSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const updateLostReason = orgActionClient
  .schema(updateLostReasonSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verificar permissão
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    // Atualiza
    await db.dealLostReason.update({
      where: {
        id: data.id,
        organizationId: ctx.orgId, // Garante tenant isolation
      },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    revalidateTag(`deal-lost-reasons:${ctx.orgId}`)

    return { success: true }
  })

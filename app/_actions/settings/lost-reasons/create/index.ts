'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createLostReasonSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const createLostReason = orgActionClient
  .schema(createLostReasonSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verificar permissão (apenas Admin/Owner pode criar configurações)
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    // Cria motivo
    await db.dealLostReason.create({
      data: {
        name: data.name,
        organizationId: ctx.orgId,
        isActive: true,
      },
    })

    revalidateTag(`deal-lost-reasons:${ctx.orgId}`)

    return { success: true }
  })

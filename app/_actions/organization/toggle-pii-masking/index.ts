'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { togglePiiMaskingSchema } from './schema'

export const togglePiiMasking = orgActionClient
  .schema(togglePiiMaskingSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Apenas ADMIN/OWNER pode alterar configurações da organização
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    await db.organization.update({
      where: { id: ctx.orgId },
      data: { hidePiiFromMembers: data.hidePiiFromMembers },
    })

    // Invalidar a config cacheada e todos os dados cujo conteúdo depende desta config
    revalidateTag(`org-settings:${ctx.orgId}`)
    revalidateTag(`contacts:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)

    return { success: true }
  })

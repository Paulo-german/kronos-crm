'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { requirePermission, canPerformAction } from '@/_lib/rbac'
import { deleteSquadSchema } from './schema'

export const deleteSquad = orgActionClient
  .schema(deleteSquadSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'squad', 'delete'))

    const squad = await db.squad.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!squad) {
      throw new Error('Squad não encontrado.')
    }

    await db.squad.delete({ where: { id: data.id } })

    revalidateTag(`squads:${ctx.orgId}`)
    revalidateTag(`squad:${data.id}`)

    return { success: true }
  })

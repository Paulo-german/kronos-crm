'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { requirePermission, canPerformAction, requireQuota } from '@/_lib/rbac'
import { createSquadSchema } from './schema'

export const createSquad = orgActionClient
  .schema(createSquadSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'squad', 'create'))
    await requireQuota(ctx.orgId, 'squad')

    const isDefault = data.isDefault ?? false

    const squad = await db.$transaction(async (tx) => {
      // Garantir unicidade do squad default na organização
      if (isDefault) {
        await tx.squad.updateMany({
          where: { organizationId: ctx.orgId, isDefault: true },
          data: { isDefault: false },
        })
      }

      return tx.squad.create({
        data: {
          organizationId: ctx.orgId,
          name: data.name,
          description: data.description || null,
          type: data.type,
          isDefault,
          distributionModel: 'ROUND_ROBIN',
        },
      })
    })

    revalidateTag(`squads:${ctx.orgId}`)

    return { success: true, squadId: squad.id }
  })

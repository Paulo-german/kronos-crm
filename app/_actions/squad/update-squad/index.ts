'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { requirePermission, canPerformAction } from '@/_lib/rbac'
import { updateSquadSchema } from './schema'

export const updateSquad = orgActionClient
  .schema(updateSquadSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'squad', 'update'))

    // Garantir que o squad pertence à organização do contexto
    const existing = await db.squad.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!existing) {
      throw new Error('Squad não encontrado.')
    }

    await db.$transaction(async (tx) => {
      // Se está marcando como default, desmarca os demais
      if (data.isDefault === true) {
        await tx.squad.updateMany({
          where: {
            organizationId: ctx.orgId,
            isDefault: true,
            NOT: { id: data.id },
          },
          data: { isDefault: false },
        })
      }

      await tx.squad.update({
        where: { id: data.id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description || null } : {}),
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
          ...(data.distributionModel !== undefined
            ? { distributionModel: data.distributionModel }
            : {}),
        },
      })
    })

    revalidateTag(`squads:${ctx.orgId}`)
    revalidateTag(`squad:${data.id}`)

    return { success: true }
  })

'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { requirePermission, canPerformAction } from '@/_lib/rbac'
import { updateSquadMemberSchema } from './schema'

export const updateSquadMember = orgActionClient
  .schema(updateSquadMemberSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'squad', 'update'))

    // Verifica ownership via join: squadMember → squad → organizationId
    const squadMember = await db.squadMember.findFirst({
      where: {
        id: data.squadMemberId,
        squad: { organizationId: ctx.orgId },
      },
      select: { id: true, squadId: true },
    })

    if (!squadMember) {
      throw new Error('Membro do squad não encontrado.')
    }

    await db.squadMember.update({
      where: { id: data.squadMemberId },
      data: {
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.weight !== undefined ? { weight: data.weight } : {}),
      },
    })

    revalidateTag(`squads:${ctx.orgId}`)
    revalidateTag(`squad:${squadMember.squadId}`)

    return { success: true }
  })

'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { requirePermission, canPerformAction } from '@/_lib/rbac'
import { removeSquadMemberSchema } from './schema'

export const removeSquadMember = orgActionClient
  .schema(removeSquadMemberSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'squad', 'update'))

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

    await db.squadMember.delete({ where: { id: data.squadMemberId } })

    revalidateTag(`squads:${ctx.orgId}`)
    revalidateTag(`squad:${squadMember.squadId}`)

    return { success: true }
  })

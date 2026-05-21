'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { requirePermission, canPerformAction } from '@/_lib/rbac'
import { addSquadMemberSchema } from './schema'

export const addSquadMember = orgActionClient
  .schema(addSquadMemberSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'squad', 'update'))

    // Garantir que o squad pertence à org
    const squad = await db.squad.findFirst({
      where: { id: data.squadId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!squad) {
      throw new Error('Squad não encontrado.')
    }

    // Garantir que o member pertence à mesma org — evita cross-tenant
    const member = await db.member.findFirst({
      where: { id: data.memberId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!member) {
      throw new Error('Membro não encontrado nesta organização.')
    }

    // Bloqueia duplicidade (constraint @@unique também protege)
    const existing = await db.squadMember.findUnique({
      where: { squadId_memberId: { squadId: data.squadId, memberId: data.memberId } },
      select: { id: true },
    })

    if (existing) {
      throw new Error('Este membro já pertence ao squad.')
    }

    const squadMember = await db.squadMember.create({
      data: {
        squadId: data.squadId,
        memberId: data.memberId,
        role: data.role,
      },
    })

    revalidateTag(`squads:${ctx.orgId}`)
    revalidateTag(`squad:${data.squadId}`)

    return { success: true, squadMemberId: squadMember.id }
  })

'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { updateGroupMemberSchema } from './schema'

export const updateGroupMember = orgActionClient
  .schema(updateGroupMemberSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agentGroup', 'update'))

    // Valida que o membro pertence a um grupo da organização
    const member = await db.agentGroupMember.findFirst({
      where: {
        id: data.memberId,
        group: { organizationId: ctx.orgId },
      },
      select: { id: true, groupId: true, isActive: true },
    })

    if (!member) {
      throw new Error('Membro não encontrado.')
    }

    // Não permitir desativar o último membro ativo do grupo
    if (data.isActive === false && member.isActive) {
      const activeMemberCount = await db.agentGroupMember.count({
        where: { groupId: member.groupId, isActive: true },
      })
      if (activeMemberCount <= 1) {
        throw new Error('Não é possível desativar o último worker ativo da equipe.')
      }
    }

    await db.agentGroupMember.update({
      where: { id: data.memberId },
      data: {
        ...(data.scopeLabel !== undefined && { scopeLabel: data.scopeLabel }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    revalidateTag(`agentGroup:${member.groupId}`)
    revalidateTag(`agentGroups:${ctx.orgId}`)

    return { success: true }
  })

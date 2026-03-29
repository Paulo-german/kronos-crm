'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { removeAgentFromGroupSchema } from './schema'

export const removeAgentFromGroup = orgActionClient
  .schema(removeAgentFromGroupSchema)
  .action(async ({ parsedInput: { memberId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agentGroup', 'update'))

    // Valida que o membro pertence a um grupo da organização e carrega contexto
    const member = await db.agentGroupMember.findFirst({
      where: {
        id: memberId,
        group: { organizationId: ctx.orgId },
      },
      select: {
        id: true,
        agentId: true,
        groupId: true,
        group: {
          select: {
            _count: { select: { members: true } },
            inboxes: { select: { id: true } },
          },
        },
      },
    })

    if (!member) {
      throw new Error('Membro não encontrado.')
    }

    // Bloqueia remoção se for o último worker — grupo precisa de pelo menos 1
    if (member.group._count.members <= 1) {
      throw new Error(
        'Não é possível remover o último agente da equipe. ' +
          'Adicione outro agente antes de remover este, ou exclua a equipe.',
      )
    }

    const inboxIds = member.group.inboxes.map((inbox) => inbox.id)

    await db.$transaction(async (tx) => {
      // Limpa activeAgentId das conversas que tinham este agente como worker ativo
      if (inboxIds.length > 0) {
        await tx.conversation.updateMany({
          where: { inboxId: { in: inboxIds }, activeAgentId: member.agentId },
          data: { activeAgentId: null },
        })
      }

      await tx.agentGroupMember.delete({ where: { id: memberId } })
    })

    revalidateTag(`agentGroup:${member.groupId}`)
    revalidateTag(`agentGroups:${ctx.orgId}`)
    revalidateTag(`agents:${ctx.orgId}`)

    return { success: true }
  })

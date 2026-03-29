'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { deleteAgentGroupSchema } from './schema'

export const deleteAgentGroup = orgActionClient
  .schema(deleteAgentGroupSchema)
  .action(async ({ parsedInput: { groupId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agentGroup', 'delete'))

    const group = await db.agentGroup.findFirst({
      where: { id: groupId, organizationId: ctx.orgId },
      select: {
        id: true,
        inboxes: { select: { id: true } },
      },
    })

    if (!group) {
      throw new Error('Equipe de agentes não encontrada.')
    }

    const inboxIds = group.inboxes.map((inbox) => inbox.id)

    await db.$transaction(async (tx) => {
      // Limpa activeAgentId das conversas vinculadas aos inboxes do grupo
      if (inboxIds.length > 0) {
        await tx.conversation.updateMany({
          where: { inboxId: { in: inboxIds } },
          data: { activeAgentId: null },
        })
      }

      // Limpa agentGroupId dos inboxes vinculados (cascade não cobre SetNull via transaction)
      if (inboxIds.length > 0) {
        await tx.inbox.updateMany({
          where: { id: { in: inboxIds } },
          data: { agentGroupId: null },
        })
      }

      // O cascade no schema deleta os AgentGroupMember automaticamente
      await tx.agentGroup.delete({ where: { id: groupId } })
    })

    revalidateTag(`agentGroups:${ctx.orgId}`)
    revalidateTag(`agentGroup:${groupId}`)
    revalidateTag(`inboxes:${ctx.orgId}`)

    return { success: true }
  })

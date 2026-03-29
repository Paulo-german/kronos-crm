'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { linkInboxToGroupSchema } from './schema'

export const linkInboxToGroup = orgActionClient
  .schema(linkInboxToGroupSchema)
  .action(async ({ parsedInput: { inboxId, agentGroupId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: { id: true, agentGroupId: true },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (agentGroupId) {
      // Valida que o grupo pertence à organização e tem pelo menos 1 worker ativo
      const group = await db.agentGroup.findFirst({
        where: { id: agentGroupId, organizationId: ctx.orgId },
        select: {
          id: true,
          members: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      })

      if (!group) {
        throw new Error('Equipe de agentes não encontrada.')
      }

      if (group.members.length === 0) {
        throw new Error('Equipe precisa de pelo menos 1 agente worker ativo para ser vinculada.')
      }

      // Vincula ao grupo e limpa agentId standalone (exclusão mútua)
      await db.inbox.update({
        where: { id: inboxId },
        data: { agentGroupId, agentId: null },
      })
    } else {
      // Desvincula o grupo e limpa activeAgentId das conversas associadas
      await db.$transaction(async (tx) => {
        await tx.inbox.update({
          where: { id: inboxId },
          data: { agentGroupId: null },
        })

        await tx.conversation.updateMany({
          where: { inboxId },
          data: { activeAgentId: null },
        })
      })
    }

    revalidateTag(`inbox:${inboxId}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    revalidateTag(`agentGroups:${ctx.orgId}`)

    if (inbox.agentGroupId) {
      revalidateTag(`agentGroup:${inbox.agentGroupId}`)
    }
    if (agentGroupId) {
      revalidateTag(`agentGroup:${agentGroupId}`)
    }

    return { success: true }
  })

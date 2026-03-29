'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

const deleteAgentSchema = z.object({
  id: z.string().uuid(),
  // Estratégia para lidar com grupos quando o agente é membro de algum
  groupStrategy: z.enum(['remove_from_groups', 'replace_with_agent']).optional(),
  replacementAgentId: z.string().uuid().optional(),
})

export const deleteAgent = orgActionClient
  .schema(deleteAgentSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'delete'))

    const agent = await db.agent.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    // Verifica se o agente é membro de algum grupo
    const groupMemberships = await db.agentGroupMember.findMany({
      where: { agentId: data.id },
      include: {
        group: { select: { id: true, name: true } },
      },
    })

    // Se pertence a grupos e não veio estratégia, pede decisão ao caller
    if (groupMemberships.length > 0 && !data.groupStrategy) {
      return {
        requiresGroupDecision: true,
        groups: groupMemberships.map((membership) => ({
          groupId: membership.group.id,
          groupName: membership.group.name,
        })),
      }
    }

    if (data.groupStrategy === 'remove_from_groups') {
      // Verifica que nenhum grupo ficará com zero workers após a remoção
      for (const membership of groupMemberships) {
        const workerCount = await db.agentGroupMember.count({
          where: { groupId: membership.groupId, isActive: true },
        })
        if (workerCount <= 1) {
          throw new Error(
            `A equipe "${membership.group.name}" ficaria sem agentes workers. ` +
              'Adicione outro agente à equipe antes de deletar este.',
          )
        }
      }

      await db.agentGroupMember.deleteMany({ where: { agentId: data.id } })
    }

    if (data.groupStrategy === 'replace_with_agent') {
      if (!data.replacementAgentId) {
        throw new Error('ID do agente substituto é obrigatório para esta estratégia.')
      }

      const replacement = await db.agent.findFirst({
        where: { id: data.replacementAgentId, organizationId: ctx.orgId },
        select: { id: true },
      })

      if (!replacement) {
        throw new Error('Agente substituto não encontrado ou não pertence à organização.')
      }

      // Substitui nas memberships — o unique([groupId, agentId]) pode conflitar se o substituto
      // já for membro do grupo, portanto removemos os registros conflitantes primeiro
      for (const membership of groupMemberships) {
        const existingMembership = await db.agentGroupMember.findUnique({
          where: {
            groupId_agentId: {
              groupId: membership.groupId,
              agentId: data.replacementAgentId,
            },
          },
        })

        if (existingMembership) {
          // Substituto já é membro: apenas remove a membership do agente sendo deletado
          await db.agentGroupMember.delete({ where: { id: membership.id } })
        } else {
          // Transfere a membership para o agente substituto
          await db.agentGroupMember.update({
            where: { id: membership.id },
            data: { agentId: data.replacementAgentId },
          })
        }
      }
    }

    // Limpa activeAgentId de todas as conversas que tinham este agente como worker ativo
    await db.conversation.updateMany({
      where: { activeAgentId: data.id },
      data: { activeAgentId: null },
    })

    await db.agent.delete({ where: { id: data.id } })

    revalidateTag(`agents:${ctx.orgId}`)
    revalidateTag(`agent:${data.id}`)
    revalidateTag(`agentGroups:${ctx.orgId}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    revalidateTag(`conversations:${ctx.orgId}`)

    return { success: true }
  })

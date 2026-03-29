'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getFeatureLimit } from '@/_lib/rbac/plan-limits'
import { addAgentToGroupSchema } from './schema'

export const addAgentToGroup = orgActionClient
  .schema(addAgentToGroupSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agentGroup', 'update'))

    // Valida que o grupo pertence à organização e carrega membros atuais
    const group = await db.agentGroup.findFirst({
      where: { id: data.groupId, organizationId: ctx.orgId },
      select: {
        id: true,
        _count: { select: { members: true } },
        members: { select: { agentId: true } },
      },
    })

    if (!group) {
      throw new Error('Equipe de agentes não encontrada.')
    }

    // Valida que o agente pertence à organização
    const agent = await db.agent.findFirst({
      where: { id: data.agentId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!agent) {
      throw new Error('Agente não encontrado ou não pertence à organização.')
    }

    // Verifica se agente já é membro
    const alreadyMember = group.members.some((member) => member.agentId === data.agentId)
    if (alreadyMember) {
      throw new Error('Este agente já é membro desta equipe.')
    }

    // Verifica o limite de workers por plano
    const maxWorkers = await getFeatureLimit(ctx.orgId, 'ai.max_workers_per_group')
    const currentWorkerCount = group._count.members

    if (currentWorkerCount >= maxWorkers) {
      throw new Error(
        `Limite de workers por equipe atingido: ${currentWorkerCount}/${maxWorkers}. ` +
          'Faça upgrade do plano para adicionar mais agentes à equipe.',
      )
    }

    await db.agentGroupMember.create({
      data: {
        groupId: data.groupId,
        agentId: data.agentId,
        scopeLabel: data.scopeLabel,
      },
    })

    revalidateTag(`agentGroups:${ctx.orgId}`)
    revalidateTag(`agentGroup:${data.groupId}`)
    revalidateTag(`agents:${ctx.orgId}`)

    return { success: true }
  })

'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { requireQuota, checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { createAgentGroupSchema } from './schema'

export const createAgentGroup = orgActionClient
  .schema(createAgentGroupSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agentGroup', 'create'))

    await requireQuota(ctx.orgId, 'agent_group')

    // Valida que todos os agentes fornecidos pertencem à organização
    const agentIds = data.members.map((member) => member.agentId)
    const agents = await db.agent.findMany({
      where: { id: { in: agentIds }, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (agents.length !== agentIds.length) {
      throw new Error('Um ou mais agentes não foram encontrados ou não pertencem à organização.')
    }

    const group = await db.$transaction(async (tx) => {
      const createdGroup = await tx.agentGroup.create({
        data: {
          organizationId: ctx.orgId,
          name: data.name,
          description: data.description,
          routerModelId: data.routerModelId ?? 'google/gemini-2.0-flash',
          routerPrompt: data.routerPrompt,
          routerConfig: data.routerConfig ?? undefined,
        },
        select: { id: true },
      })

      await tx.agentGroupMember.createMany({
        data: data.members.map((member) => ({
          groupId: createdGroup.id,
          agentId: member.agentId,
          scopeLabel: member.scopeLabel,
        })),
      })

      return createdGroup
    })

    revalidateTag(`agentGroups:${ctx.orgId}`)

    const quota = await checkPlanQuota(ctx.orgId, 'agent_group')
    return { success: true, groupId: group.id, current: quota.current, limit: quota.limit }
  })

'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createStepSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const createStep = orgActionClient
  .schema(createStepSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    const agent = await db.agent.findFirst({
      where: { id: data.agentId, organizationId: ctx.orgId },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    // Próxima ordem = max(order) + 1
    const maxStep = await db.agentStep.findFirst({
      where: { agentId: data.agentId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const nextOrder = (maxStep?.order ?? -1) + 1

    const step = await db.agentStep.create({
      data: {
        agentId: data.agentId,
        name: data.name,
        objective: data.objective,
        allowedActions: data.allowedActions || [],
        activationRequirement: data.activationRequirement || null,
        order: nextOrder,
      },
    })

    revalidateTag(`agent:${data.agentId}`)
    revalidateTag(`agents:${ctx.orgId}`)

    return { success: true, stepId: step.id }
  })

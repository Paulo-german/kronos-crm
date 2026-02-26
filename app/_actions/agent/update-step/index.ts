'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateStepSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const updateStep = orgActionClient
  .schema(updateStepSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    const agent = await db.agent.findFirst({
      where: { id: data.agentId, organizationId: ctx.orgId },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    const step = await db.agentStep.findFirst({
      where: { id: data.id, agentId: data.agentId },
    })

    if (!step) {
      throw new Error('Etapa não encontrada.')
    }

    await db.agentStep.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.objective !== undefined && { objective: data.objective }),
        ...(data.allowedActions !== undefined && {
          allowedActions: data.allowedActions,
        }),
        ...(data.activationRequirement !== undefined && {
          activationRequirement: data.activationRequirement,
        }),
      },
    })

    revalidateTag(`agent:${data.agentId}`)

    return { success: true }
  })

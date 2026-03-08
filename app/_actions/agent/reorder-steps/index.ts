'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { reorderStepsSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const reorderSteps = orgActionClient
  .schema(reorderStepsSchema)
  .action(async ({ parsedInput: { agentId, stepIds }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    const agent = await db.agent.findFirst({
      where: { id: agentId, organizationId: ctx.orgId },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    // Verifica que todos os stepIds pertencem ao agente
    const existingSteps = await db.agentStep.findMany({
      where: { agentId, id: { in: stepIds } },
      select: { id: true },
    })

    if (existingSteps.length !== stepIds.length) {
      throw new Error('Uma ou mais etapas não pertencem a este agente.')
    }

    // Garante que TODAS as etapas estão incluídas (evita gaps de order)
    const totalSteps = await db.agentStep.count({ where: { agentId } })

    if (stepIds.length !== totalSteps) {
      throw new Error('Todas as etapas devem ser incluídas na reordenação.')
    }

    // Atualiza a ordem de cada step em uma transaction
    await db.$transaction(
      stepIds.map((stepId, index) =>
        db.agentStep.update({
          where: { id: stepId },
          data: { order: index },
        }),
      ),
    )

    revalidateTag(`agent:${agentId}`)

    return { success: true }
  })

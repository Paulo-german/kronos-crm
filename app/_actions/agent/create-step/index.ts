'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createStepSchema } from './schema'
import { db } from '@/_lib/prisma'
import { Prisma } from '@prisma/client'
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

    // Próxima ordem = max(order) + 1 — em transaction para evitar race condition
    const step = await db.$transaction(async (tx) => {
      const maxStep = await tx.agentStep.findFirst({
        where: { agentId: data.agentId },
        orderBy: { order: 'desc' },
        select: { order: true },
      })

      const nextOrder = (maxStep?.order ?? -1) + 1

      return tx.agentStep.create({
        data: {
          agentId: data.agentId,
          name: data.name,
          objective: data.objective,
          actions: data.actions.length > 0 ? data.actions : Prisma.JsonNull,
          keyQuestion: data.keyQuestion || null,
          messageTemplate: data.messageTemplate || null,
          order: nextOrder,
        },
      })
    })

    revalidateTag(`agent:${data.agentId}`)
    revalidateTag(`agents:${ctx.orgId}`)

    return { success: true, stepId: step.id }
  })

'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateStepSchema } from './schema'
import { Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { normalizeToolIds } from '../shared/normalize-tool-ids'

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

    const normalizedActions = normalizeToolIds(data.actions)

    await db.agentStep.update({
      where: { id: data.id },
      data: {
        name: data.name,
        objective: data.objective,
        actions:
          normalizedActions.length > 0 ? normalizedActions : Prisma.JsonNull,
        keyQuestion: data.keyQuestion || null,
        messageTemplate: data.messageTemplate || null,
        lifecycleTrigger: data.lifecycleTrigger ?? null,
        lifecycleDealPipelineId: data.lifecycleDealPipelineId ?? null,
        autoDealStageId: data.autoDealStageId ?? null,
        autoTasks: data.autoTasks && data.autoTasks.length > 0 ? data.autoTasks : Prisma.JsonNull,
      },
    })

    revalidateTag(`agent:${data.agentId}`)
    revalidateTag(`agents:${ctx.orgId}`)

    return { success: true }
  })

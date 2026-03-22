'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

const deleteStepSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
})

export const deleteStep = orgActionClient
  .schema(deleteStepSchema)
  .action(async ({ parsedInput: { id, agentId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    const agent = await db.agent.findFirst({
      where: { id: agentId, organizationId: ctx.orgId },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    const step = await db.agentStep.findFirst({
      where: { id, agentId },
    })

    if (!step) {
      throw new Error('Etapa não encontrada.')
    }

    await db.$transaction([
      db.agentStep.delete({ where: { id } }),
      db.agentStep.updateMany({
        where: { agentId, order: { gt: step.order } },
        data: { order: { decrement: 1 } },
      }),
    ])

    // Limpar follow-ups pendentes nas conversas do agente — a cadeia pode ter mudado
    // com a remoção do step (os links FollowUpAgentStep são removidos em cascade)
    await db.conversation.updateMany({
      where: {
        inbox: { agentId },
        nextFollowUpAt: { not: null },
      },
      data: { nextFollowUpAt: null, followUpCount: 0 },
    })

    revalidateTag(`agent:${agentId}`)
    revalidateTag(`agents:${ctx.orgId}`)
    revalidateTag(`follow-ups:${agentId}`)
    revalidateTag(`conversations:${ctx.orgId}`)

    return { success: true }
  })

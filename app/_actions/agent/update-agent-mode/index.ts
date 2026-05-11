'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateAgentModeSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const updateAgentMode = orgActionClient
  .schema(updateAgentModeSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    const existingAgent = await db.agent.findFirst({
      where: { id: data.agentId, organizationId: ctx.orgId },
    })

    if (!existingAgent) {
      throw new Error('Agente não encontrado.')
    }

    await db.agent.update({
      where: { id: data.agentId },
      data: { agentMode: data.agentMode },
    })

    revalidateTag(`agent:${data.agentId}`)
    revalidateTag(`agents:${ctx.orgId}`)

    return { success: true }
  })

'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

const deleteKnowledgeFileSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
})

export const deleteKnowledgeFile = orgActionClient
  .schema(deleteKnowledgeFileSchema)
  .action(async ({ parsedInput: { id, agentId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    const agent = await db.agent.findFirst({
      where: { id: agentId, organizationId: ctx.orgId },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    const file = await db.agentKnowledgeFile.findFirst({
      where: { id, agentId },
    })

    if (!file) {
      throw new Error('Arquivo não encontrado.')
    }

    await db.agentKnowledgeFile.delete({ where: { id } })

    revalidateTag(`agent:${agentId}`)
    revalidateTag(`agents:${ctx.orgId}`)

    return { success: true }
  })

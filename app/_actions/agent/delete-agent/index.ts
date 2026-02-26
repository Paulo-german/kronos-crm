'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

const deleteAgentSchema = z.object({
  id: z.string().uuid(),
})

export const deleteAgent = orgActionClient
  .schema(deleteAgentSchema)
  .action(async ({ parsedInput: { id }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'delete'))

    const agent = await db.agent.findFirst({
      where: { id, organizationId: ctx.orgId },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    await db.agent.delete({ where: { id } })

    revalidateTag(`agents:${ctx.orgId}`)
    revalidateTag(`agent:${id}`)

    return { success: true }
  })

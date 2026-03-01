'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

const linkInboxToAgentSchema = z.object({
  inboxId: z.string().uuid(),
  agentId: z.string().uuid().nullable(),
})

export const linkInboxToAgent = orgActionClient
  .schema(linkInboxToAgentSchema)
  .action(async ({ parsedInput: { inboxId, agentId }, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Verificar inbox pertence à org (inclui evolutionInstanceName para saber se está conectado)
    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: { id: true, agentId: true, evolutionInstanceName: true },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    // 3. Se agentId fornecido, validar que pertence à org
    if (agentId) {
      const agent = await db.agent.findFirst({
        where: { id: agentId, organizationId: ctx.orgId },
        select: { id: true },
      })

      if (!agent) {
        throw new Error('Agente não encontrado ou não pertence à organização.')
      }
    }

    // 4. Vincular/desvincular
    await db.inbox.update({
      where: { id: inboxId },
      data: { agentId },
    })

    // 5. Invalidar cache
    revalidateTag(`inbox:${inboxId}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
    }
    if (agentId) {
      revalidateTag(`agent:${agentId}`)
    }
    revalidateTag(`agents:${ctx.orgId}`)

    // Se inbox conectado, invalidar conversas (webhook roteia para novo agent)
    if (inbox.evolutionInstanceName) {
      revalidateTag(`conversations:${ctx.orgId}`)
    }

    return { success: true }
  })

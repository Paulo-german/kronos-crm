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
      select: { id: true, agentId: true, agentGroupId: true, evolutionInstanceName: true },
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

    // 4. Vincular/desvincular — ao setar agentId, limpar agentGroupId (exclusão mútua)
    if (agentId && inbox.agentGroupId) {
      // Migrando de grupo para agente standalone: limpar activeAgentId das conversas
      await db.$transaction(async (tx) => {
        await tx.inbox.update({
          where: { id: inboxId },
          data: { agentId, agentGroupId: null },
        })
        await tx.conversation.updateMany({
          where: { inboxId },
          data: { activeAgentId: null },
        })
      })
    } else {
      await db.inbox.update({
        where: { id: inboxId },
        data: {
          agentId,
          ...(agentId ? { agentGroupId: null } : {}),
        },
      })
    }

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
    // Invalidar grupo anterior quando o inbox migra para agente standalone
    if (inbox.agentGroupId) {
      revalidateTag(`agentGroup:${inbox.agentGroupId}`)
      revalidateTag(`agentGroups:${ctx.orgId}`)
    }

    // Se inbox conectado, invalidar conversas (webhook roteia para novo agent)
    if (inbox.evolutionInstanceName) {
      revalidateTag(`conversations:${ctx.orgId}`)
    }

    return { success: true }
  })

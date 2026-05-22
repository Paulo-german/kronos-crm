'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { disconnectEvolutionGoInboxSchema } from './schema'

/**
 * Limpa a flag `evolutionConnected` localmente. Selfhosted — não tocamos
 * na instância remota do cliente para não causar surpresas.
 */
export const disconnectEvolutionGoInbox = orgActionClient
  .schema(disconnectEvolutionGoInboxSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: { id: true, agentId: true, connectionType: true, evolutionInstanceName: true },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (inbox.connectionType !== 'EVOLUTION_GO' || !inbox.evolutionInstanceName) {
      throw new Error('Esta caixa de entrada não possui instância Evolution Go.')
    }

    await db.inbox.update({
      where: { id: inbox.id },
      data: { evolutionConnected: false },
    })

    revalidateTag(`inbox:${inbox.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return { success: true }
  })

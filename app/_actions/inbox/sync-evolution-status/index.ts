'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

const syncEvolutionStatusSchema = z.object({
  inboxId: z.string().uuid(),
  connected: z.boolean(),
})

/**
 * Action leve para sincronizar o campo evolutionConnected com o estado real
 * da Evolution API. Chamada pelo card de conexao quando o polling detecta
 * divergencia entre o banco e o estado real.
 */
export const syncEvolutionStatus = orgActionClient
  .schema(syncEvolutionStatusSchema)
  .action(async ({ parsedInput: { inboxId, connected }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'read'))

    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: { id: true, evolutionConnected: true, agentId: true },
    })

    if (!inbox) return { synced: false }

    // Evitar write desnecessario
    if (inbox.evolutionConnected === connected) return { synced: false }

    await db.inbox.update({
      where: { id: inbox.id },
      data: { evolutionConnected: connected },
    })

    revalidateTag(`inbox:${inbox.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return { synced: true }
  })

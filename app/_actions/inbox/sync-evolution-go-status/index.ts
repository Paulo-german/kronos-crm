'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getEvolutionGoInstanceStatus } from '@/_lib/evolution-go/instance-management'
import { resolveEvolutionGoCredentials } from '@/_lib/evolution-go/resolve-credentials'
import { syncEvolutionGoStatusSchema } from './schema'

/**
 * Consulta o status real no servidor Go e sincroniza `evolutionConnected` no banco.
 * Chamada pelo card de conexão quando o polling detecta divergência.
 */
export const syncEvolutionGoStatus = orgActionClient
  .schema(syncEvolutionGoStatusSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'read'))

    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: {
        id: true,
        agentId: true,
        evolutionConnected: true,
        evolutionInstanceName: true,
        connectionType: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (inbox.connectionType !== 'EVOLUTION_GO' || !inbox.evolutionInstanceName) {
      throw new Error('Esta caixa de entrada não possui instância Evolution Go.')
    }

    const credentials = await resolveEvolutionGoCredentials(inboxId)
    const { state } = await getEvolutionGoInstanceStatus(
      inbox.evolutionInstanceName,
      credentials,
    )
    const connected = state === 'open'

    if (inbox.evolutionConnected === connected) {
      return { synced: false, state, connected }
    }

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

    return { synced: true, state, connected }
  })

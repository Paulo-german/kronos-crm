'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { resolveEvolutionGoCredentials } from '@/_lib/evolution-go/resolve-credentials'
import { testEvolutionGoConnectionSchema } from './schema'

type ConnectionStateValue = 'open' | 'close' | 'connecting'

export const testEvolutionGoConnection = orgActionClient
  .schema(testEvolutionGoConnectionSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    // 1. RBAC — leitura suficiente para teste diagnóstico
    requirePermission(canPerformAction(ctx, 'inbox', 'read'))

    // 2. Verificar que o inbox pertence à org
    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: { id: true, agentId: true, evolutionInstanceName: true, evolutionConnected: true },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (!inbox.evolutionInstanceName) {
      return {
        success: false as const,
        error: 'Nenhuma instância vinculada a esta caixa de entrada.',
      }
    }

    const credentials = await resolveEvolutionGoCredentials(inboxId)

    // 3. Fetch inline para distinguir HTTP ok de HTTP erro
    const response = await fetch(
      `${credentials.apiUrl}/instance/${encodeURIComponent(inbox.evolutionInstanceName)}/status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: credentials.apiToken,
        },
      },
    ).catch(() => null)

    if (!response || !response.ok) {
      return {
        success: false as const,
        error: 'Não foi possível consultar a instância. Verifique a URL e o token.',
      }
    }

    const data = await response.json().catch(() => null)
    const state: ConnectionStateValue = data?.state ?? data?.instance?.state ?? 'close'
    const connected = state === 'open'

    // 4. Sincronizar evolutionConnected no banco se divergir do estado real
    if (inbox.evolutionConnected !== connected) {
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
    }

    return { success: true as const, state }
  })

'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { resolveEvolutionCredentials } from '@/_lib/evolution/resolve-credentials'
import { testEvolutionConnectionSchema } from './schema'

type ConnectionStateValue = 'open' | 'close' | 'connecting'

export const testEvolutionConnection = orgActionClient
  .schema(testEvolutionConnectionSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    // 1. RBAC — leitura é suficiente para um teste diagnóstico
    requirePermission(canPerformAction(ctx, 'inbox', 'read'))

    // 2. Verificar que o inbox pertence à org e pegar o instanceName vinculado
    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: { id: true, evolutionInstanceName: true },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    const credentials = await resolveEvolutionCredentials(inboxId)

    if (!inbox.evolutionInstanceName) {
      return {
        success: false as const,
        error: 'Nenhuma instância vinculada a esta caixa de entrada.',
        isSelfHosted: credentials.isSelfHosted,
      }
    }

    // 3. Fetch inline distingue HTTP ok de HTTP erro (o helper getEvolutionConnectionState
    // mascara falhas retornando sempre { state: 'close' }).
    const response = await fetch(
      `${credentials.apiUrl}/instance/connectionState/${encodeURIComponent(inbox.evolutionInstanceName)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: credentials.apiKey,
        },
      },
    ).catch(() => null)

    if (!response || !response.ok) {
      return {
        success: false as const,
        error:
          'Não foi possível consultar a instância. Verifique a URL e a API Key.',
        isSelfHosted: credentials.isSelfHosted,
      }
    }

    const data = await response.json().catch(() => null)
    const state: ConnectionStateValue =
      data?.instance?.state ?? data?.state ?? 'close'

    return {
      success: true as const,
      state,
      isSelfHosted: credentials.isSelfHosted,
    }
  })

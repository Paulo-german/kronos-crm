'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { resolveEvolutionCredentials } from '@/_lib/evolution/resolve-credentials'
import { testEvolutionConnectionSchema } from './schema'

export const testEvolutionConnection = orgActionClient
  .schema(testEvolutionConnectionSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    // 1. RBAC — leitura é suficiente para um teste diagnóstico
    requirePermission(canPerformAction(ctx, 'inbox', 'read'))

    // 2. Verificar que o inbox pertence à org
    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    // 3. Resolver credenciais salvas (self-hosted ou globais)
    const credentials = await resolveEvolutionCredentials(inboxId)

    // 4. Testar conexão via endpoint de listagem de instâncias
    const testResponse = await fetch(
      `${credentials.apiUrl}/instance/fetchInstances`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: credentials.apiKey,
        },
      },
    ).catch(() => null)

    if (!testResponse || !testResponse.ok) {
      return {
        success: false as const,
        error: 'Não foi possível conectar à Evolution API. Verifique a URL e a API Key.',
        isSelfHosted: credentials.isSelfHosted,
      }
    }

    const instances = await testResponse.json().catch(() => [])
    const instanceCount = Array.isArray(instances) ? instances.length : 0

    return {
      success: true as const,
      instanceCount,
      isSelfHosted: credentials.isSelfHosted,
    }
  })

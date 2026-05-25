'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { pollEvolutionGoQR } from '@/_lib/evolution-go/instance-management'
import { resolveEvolutionGoCredentials } from '@/_lib/evolution-go/resolve-credentials'
import { getEvolutionGoQrSchema } from './schema'

export const getEvolutionGoQr = orgActionClient
  .schema(getEvolutionGoQrSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'read'))

    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: { evolutionInstanceName: true, connectionType: true },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (inbox.connectionType !== 'EVOLUTION_GO' || !inbox.evolutionInstanceName) {
      throw new Error('Esta caixa de entrada não possui instância Evolution Go.')
    }

    const credentials = await resolveEvolutionGoCredentials(inboxId)

    // Polling puro — sem POST /connect para não resetar a conexão em andamento
    const result = await pollEvolutionGoQR(inbox.evolutionInstanceName, credentials)

    return {
      base64: result.base64,
      code: result.code,
      pairingCode: result.pairingCode,
      state: result.state,
    }
  })

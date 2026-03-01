'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getEvolutionQRCode } from '@/_lib/evolution/instance-management'

const getEvolutionQRSchema = z.object({
  agentId: z.string().uuid(),
})

export const getEvolutionQR = orgActionClient
  .schema(getEvolutionQRSchema)
  .action(async ({ parsedInput: { agentId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'read'))

    const agent = await db.agent.findFirst({
      where: { id: agentId, organizationId: ctx.orgId },
      select: { evolutionInstanceName: true },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    if (!agent.evolutionInstanceName) {
      throw new Error('Agente não possui instância WhatsApp.')
    }

    const result = await getEvolutionQRCode(agent.evolutionInstanceName)

    return {
      base64: result.base64,
      code: result.code,
      pairingCode: result.pairingCode,
      state: result.state,
    }
  })

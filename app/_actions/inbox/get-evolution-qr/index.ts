'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getEvolutionQRCode } from '@/_lib/evolution/instance-management'

const getEvolutionQRSchema = z.object({
  inboxId: z.string().uuid(),
})

export const getEvolutionQR = orgActionClient
  .schema(getEvolutionQRSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'read'))

    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: { evolutionInstanceName: true },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (!inbox.evolutionInstanceName) {
      throw new Error('Esta caixa de entrada não possui instância WhatsApp.')
    }

    const result = await getEvolutionQRCode(inbox.evolutionInstanceName)

    return {
      base64: result.base64,
      code: result.code,
      pairingCode: result.pairingCode,
      state: result.state,
    }
  })

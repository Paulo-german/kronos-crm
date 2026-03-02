'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { createEvolutionInstance, buildWebhookUrl } from '@/_lib/evolution/instance-management'

const connectEvolutionSchema = z.object({
  inboxId: z.string().uuid(),
})

export const connectEvolution = orgActionClient
  .schema(connectEvolutionSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (inbox.evolutionInstanceName) {
      throw new Error('Esta caixa de entrada já possui uma instância WhatsApp conectada.')
    }

    // Gera nome único para a instância
    const instanceName = `kronos-${ctx.orgId.slice(0, 8)}-${inbox.id.slice(0, 8)}`

    const result = await createEvolutionInstance(instanceName, buildWebhookUrl())

    await db.inbox.update({
      where: { id: inbox.id },
      data: {
        evolutionInstanceName: result.instanceName,
        evolutionInstanceId: result.instanceId,
      },
    })

    revalidateTag(`inbox:${inbox.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return {
      success: true,
      inboxId: inbox.id,
      instanceName: result.instanceName,
      qrBase64: result.qrBase64,
    }
  })

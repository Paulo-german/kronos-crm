'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { disconnectEvolutionInstance } from '@/_lib/evolution/instance-management'

const disconnectEvolutionSchema = z.object({
  inboxId: z.string().uuid(),
})

export const disconnectEvolution = orgActionClient
  .schema(disconnectEvolutionSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: { evolutionInstanceName: true, agentId: true },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (!inbox.evolutionInstanceName) {
      throw new Error('Esta caixa de entrada não possui instância WhatsApp.')
    }

    // Limpa DB primeiro, depois desconecta Evolution API.
    await db.inbox.update({
      where: { id: inboxId },
      data: {
        evolutionInstanceName: null,
        evolutionInstanceId: null,
      },
    })

    try {
      await disconnectEvolutionInstance(inbox.evolutionInstanceName)
    } catch {
      // Best-effort: sessão Evolution pode expirar sozinha
    }

    revalidateTag(`inbox:${inboxId}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return { success: true }
  })

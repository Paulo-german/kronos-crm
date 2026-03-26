'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { deleteEvolutionInstance } from '@/_lib/evolution/instance-management'

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

    // Deleta instância na Evolution API primeiro, depois limpa DB.
    // Usa delete (não logout) para evitar instância órfã que seria re-importada.
    try {
      await deleteEvolutionInstance(inbox.evolutionInstanceName)
    } catch {
      // Best-effort: instância pode já ter sido removida
    }

    await db.inbox.update({
      where: { id: inboxId },
      data: {
        evolutionInstanceName: null,
        evolutionInstanceId: null,
        evolutionConnected: false,
      },
    })

    revalidateTag(`inbox:${inboxId}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return { success: true }
  })

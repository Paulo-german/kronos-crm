'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { deleteEvolutionInstance } from '@/_lib/evolution/instance-management'
import { resolveEvolutionCredentials } from '@/_lib/evolution/resolve-credentials'

const disconnectEvolutionSchema = z.object({
  inboxId: z.string().uuid(),
})

export const disconnectEvolution = orgActionClient
  .schema(disconnectEvolutionSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: {
        evolutionInstanceName: true,
        evolutionApiUrl: true,
        evolutionApiKey: true,
        agentId: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (!inbox.evolutionInstanceName) {
      throw new Error('Esta caixa de entrada não possui instância WhatsApp.')
    }

    const isSelfHosted = !!(inbox.evolutionApiUrl && inbox.evolutionApiKey)

    if (isSelfHosted) {
      // Self-hosted: apenas limpar a referência no banco. Não tocar na instância do usuário.
    } else {
      // Instância gerenciada (Kronos): deleta na Evolution API para evitar instância órfã.
      const credentials = await resolveEvolutionCredentials(inboxId)
      try {
        await deleteEvolutionInstance(inbox.evolutionInstanceName, credentials)
      } catch {
        // Best-effort: instância pode já ter sido removida
      }
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

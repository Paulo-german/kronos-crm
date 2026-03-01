'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { disconnectEvolutionInstance } from '@/_lib/evolution/instance-management'

const disconnectEvolutionSchema = z.object({
  agentId: z.string().uuid(),
})

export const disconnectEvolution = orgActionClient
  .schema(disconnectEvolutionSchema)
  .action(async ({ parsedInput: { agentId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

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

    // Limpa DB primeiro, depois desconecta Evolution API.
    // Se Evolution falhar, o agente fica sem instância (pode reconectar).
    // Preferível a ficar com instância fantasma no banco.
    await db.agent.update({
      where: { id: agentId },
      data: {
        evolutionInstanceName: null,
        evolutionInstanceId: null,
      },
    })

    try {
      await disconnectEvolutionInstance(agent.evolutionInstanceName)
    } catch {
      // Best-effort: sessão Evolution pode expirar sozinha
    }

    revalidateTag(`agent:${agentId}`)
    revalidateTag(`agents:${ctx.orgId}`)

    return { success: true }
  })

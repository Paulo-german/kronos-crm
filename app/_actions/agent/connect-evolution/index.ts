'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { createEvolutionInstance } from '@/_lib/evolution/instance-management'

const connectEvolutionSchema = z.object({
  agentId: z.string().uuid(),
})

export const connectEvolution = orgActionClient
  .schema(connectEvolutionSchema)
  .action(async ({ parsedInput: { agentId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    const agent = await db.agent.findFirst({
      where: { id: agentId, organizationId: ctx.orgId },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    if (agent.evolutionInstanceName) {
      throw new Error('Agente já possui uma instância WhatsApp conectada.')
    }

    // Gera nome único para a instância
    const instanceName = `kronos-${ctx.orgId.slice(0, 8)}-${agentId.slice(0, 8)}`

    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || vercelUrl

    if (!appUrl) {
      throw new Error('NEXT_PUBLIC_APP_URL ou VERCEL_URL deve estar configurada para conectar WhatsApp.')
    }

    // Inclui secret na URL do webhook (validado em /api/webhooks/evolution)
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET
    const webhookUrl = webhookSecret
      ? `${appUrl}/api/webhooks/evolution?secret=${webhookSecret}`
      : `${appUrl}/api/webhooks/evolution`

    const result = await createEvolutionInstance(instanceName, webhookUrl)

    await db.agent.update({
      where: { id: agentId },
      data: {
        evolutionInstanceName: result.instanceName,
        evolutionInstanceId: result.instanceId,
      },
    })

    revalidateTag(`agent:${agentId}`)
    revalidateTag(`agents:${ctx.orgId}`)

    return {
      success: true,
      instanceName: result.instanceName,
      qrBase64: result.qrBase64,
    }
  })

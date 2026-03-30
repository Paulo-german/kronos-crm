'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { resolveEvolutionCredentials } from '@/_lib/evolution/resolve-credentials'
import { getEvolutionInstanceInfo } from '@/_lib/evolution/instance-management'
import { connectEvolutionSelfHostedSchema } from './schema'

export const connectEvolutionSelfHosted = orgActionClient
  .schema(connectEvolutionSelfHostedSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Verificar que o inbox pertence à org e tem credenciais self-hosted salvas
    const inbox = await db.inbox.findFirst({
      where: { id: data.inboxId, organizationId: ctx.orgId },
      select: {
        id: true,
        agentId: true,
        evolutionApiUrl: true,
        evolutionApiKey: true,
        evolutionInstanceName: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (!inbox.evolutionApiUrl || !inbox.evolutionApiKey) {
      throw new Error(
        'Configure as credenciais da Evolution API antes de conectar uma instância.',
      )
    }

    if (inbox.evolutionInstanceName) {
      throw new Error('Esta caixa de entrada já possui uma instância conectada. Desconecte primeiro.')
    }

    // 3. Resolver credenciais self-hosted e buscar info da instância
    const credentials = await resolveEvolutionCredentials(data.inboxId)
    const instanceInfo = await getEvolutionInstanceInfo(data.instanceName, credentials)

    // instanceId: usar o identificador retornado pela API ou fallback para o próprio instanceName
    const instanceId = instanceInfo?.ownerJid ?? data.instanceName

    // 4. Registrar instanceName no banco
    // NÃO chama createEvolutionInstance (instância já existe no servidor do usuário)
    // NÃO chama updateEvolutionWebhook (usuário configura webhook manualmente)
    await db.inbox.update({
      where: { id: inbox.id },
      data: {
        connectionType: 'EVOLUTION',
        evolutionInstanceName: data.instanceName,
        evolutionInstanceId: instanceId,
        evolutionConnected: false,
      },
    })

    // 5. Invalidar cache
    revalidateTag(`inbox:${inbox.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return {
      success: true,
      instanceName: data.instanceName,
    }
  })

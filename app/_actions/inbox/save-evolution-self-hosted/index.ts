'use server'

import { revalidateTag } from 'next/cache'
import { Prisma } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getEvolutionInstanceInfo } from '@/_lib/evolution/instance-management'
import { evolutionSelfHostedSchema } from './schema'

export const saveEvolutionSelfHosted = orgActionClient
  .schema(evolutionSelfHostedSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Verificar que o inbox pertence à org (nunca confiar no client)
    const inbox = await db.inbox.findFirst({
      where: { id: data.inboxId, organizationId: ctx.orgId },
      select: {
        id: true,
        agentId: true,
        evolutionApiKey: true,
        evolutionWebhookSecret: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    // 3. Resolver API Key: se vazia no input, manter a existente (edição sem alterar key)
    const resolvedApiKey = data.evolutionApiKey || inbox.evolutionApiKey
    if (!resolvedApiKey) {
      throw new Error('API Key obrigatória.')
    }

    // 4. Teste autoritativo: connectionState valida URL + instanceName + apiKey em uma chamada.
    // Fetch inline (e não getEvolutionConnectionState) para distinguir HTTP ok de HTTP erro —
    // a função helper retorna { state: 'close' } em qualquer falha HTTP, o que esconderia credenciais inválidas.
    const testResponse = await fetch(
      `${data.evolutionApiUrl}/instance/connectionState/${encodeURIComponent(data.evolutionInstanceName)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: resolvedApiKey,
        },
      },
    ).catch(() => null)

    if (!testResponse || !testResponse.ok) {
      throw new Error(
        'Não foi possível conectar à Evolution API. Verifique a URL, o nome da instância e a API Key.',
      )
    }

    // 5. Buscar ownerJid em best-effort — se falhar, cai no instanceName como instanceId
    const credentials = {
      apiUrl: data.evolutionApiUrl,
      apiKey: resolvedApiKey,
      isSelfHosted: true,
    }
    const instanceInfo = await getEvolutionInstanceInfo(
      data.evolutionInstanceName,
      credentials,
    ).catch(() => null)

    // 6. Gerar secret apenas se ainda não existe (preserva em edições)
    const webhookSecret = inbox.evolutionWebhookSecret ?? crypto.randomUUID()

    // 7. Update unificado — grava credenciais + bind da instância em uma única operação
    try {
      await db.inbox.update({
        where: { id: inbox.id },
        data: {
          evolutionApiUrl: data.evolutionApiUrl,
          evolutionApiKey: resolvedApiKey,
          evolutionInstanceName: data.evolutionInstanceName,
          evolutionInstanceId: instanceInfo?.ownerJid ?? data.evolutionInstanceName,
          connectionType: 'EVOLUTION',
          evolutionWebhookSecret: webhookSecret,
        },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new Error(
          'Este nome de instância já está vinculado a outra caixa de entrada.',
        )
      }
      throw error
    }

    // 8. Invalidar cache
    revalidateTag(`inbox:${inbox.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return { success: true, webhookSecret }
  })

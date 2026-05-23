'use server'

import { revalidateTag } from 'next/cache'
import { Prisma } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import {
  buildEvolutionGoWebhookUrl,
  createEvolutionGoInstance,
  getEvolutionGoInstanceStatus,
  updateEvolutionGoWebhook,
} from '@/_lib/evolution-go/instance-management'
import type { EvolutionGoCredentials } from '@/_lib/evolution-go/types'
import { connectEvolutionGoInboxSchema } from './schema'

export const connectEvolutionGoInbox = orgActionClient
  .schema(connectEvolutionGoInboxSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Inbox da org (nunca confiar no client)
    const inbox = await db.inbox.findFirst({
      where: { id: data.inboxId, organizationId: ctx.orgId },
      select: {
        id: true,
        agentId: true,
        evolutionInstanceName: true,
        evolutionWebhookSecret: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    const credentials: EvolutionGoCredentials = {
      apiUrl: data.apiUrl,
      apiToken: data.apiToken,
    }

    // 3. Resolver nome da instância: parâmetro explícito > salvo no DB > gerar novo
    const instanceName =
      data.instanceName ??
      inbox.evolutionInstanceName ??
      `kronos-go-${ctx.orgId.slice(0, 8)}-${inbox.id.slice(0, 8)}`

    // 4. Checar se a instância já existe no servidor (lança em 401/403, null se 404)
    const statusResult = await getEvolutionGoInstanceStatus(instanceName, credentials).catch(
      (error: Error) => {
        throw new Error(
          `Não foi possível conectar ao servidor Evolution Go: ${error.message}`,
        )
      },
    )

    // 5. Webhook secret per-inbox (preserva em re-conexões)
    const webhookSecret = inbox.evolutionWebhookSecret ?? crypto.randomUUID()
    const webhookUrl = buildEvolutionGoWebhookUrl(webhookSecret)

    // 6. Criar ou atualizar webhook dependendo se a instância existe
    let qrBase64: string | null = null

    if (statusResult !== null) {
      // Instância existe — apenas atualiza o webhook
      await updateEvolutionGoWebhook(instanceName, webhookUrl, credentials).catch(
        (error: Error) => {
          throw new Error(`Falha ao atualizar webhook no Evolution Go: ${error.message}`)
        },
      )
    } else {
      // Instância não existe — cria do zero e retorna QR
      const createResult = await createEvolutionGoInstance(
        instanceName,
        webhookSecret,
        webhookUrl,
        credentials,
      ).catch((error: Error) => {
        throw new Error(`Falha ao criar instância no Evolution Go: ${error.message}`)
      })
      qrBase64 = createResult.qrBase64
    }

    // 7. Persistir credenciais + connectionType
    try {
      await db.inbox.update({
        where: { id: inbox.id },
        data: {
          connectionType: 'EVOLUTION_GO',
          evolutionApiUrl: data.apiUrl,
          evolutionApiKey: data.apiToken,
          evolutionInstanceName: instanceName,
          evolutionInstanceId: instanceName,
          evolutionWebhookSecret: webhookSecret,
          evolutionConnected: false,
        },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new Error('Este nome de instância já está vinculado a outra caixa de entrada.')
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

    return {
      success: true,
      inboxId: inbox.id,
      instanceName,
      qrBase64,
    }
  })

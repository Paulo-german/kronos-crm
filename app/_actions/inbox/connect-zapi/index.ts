'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getZApiConnectionStatus } from '@/_lib/zapi/instance-info'
import { connectZApiSchema } from './schema'

export const connectZApi = orgActionClient
  .schema(connectZApiSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: somente OWNER e ADMIN podem configurar conexoes
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Validar inbox pertence a org
    const inbox = await db.inbox.findFirst({
      where: { id: data.inboxId, organizationId: ctx.orgId },
      select: {
        id: true,
        agentId: true,
        evolutionInstanceName: true,
        metaPhoneNumberId: true,
        zapiInstanceId: true,
        connectionType: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    // 3. Validar que o inbox nao tem conexao ativa
    if (inbox.connectionType === 'Z_API' && inbox.zapiInstanceId) {
      throw new Error('Esta caixa de entrada já possui uma conexão Z-API ativa.')
    }

    if (inbox.connectionType === 'META_CLOUD' && inbox.metaPhoneNumberId) {
      throw new Error('Esta caixa de entrada já possui uma conexão Meta WhatsApp ativa. Desconecte primeiro.')
    }

    if (inbox.evolutionInstanceName) {
      throw new Error('Esta caixa de entrada já possui uma conexão WhatsApp via QR Code. Desconecte primeiro.')
    }

    // 3b. Validar que o instanceId nao esta associado a outro inbox
    const conflictingInbox = await db.inbox.findFirst({
      where: {
        zapiInstanceId: data.instanceId,
        id: { not: data.inboxId },
      },
    })

    if (conflictingInbox) {
      throw new Error('Este Instance ID já está conectado a outra caixa de entrada.')
    }

    // 4. Validar credenciais chamando GET /me da Z-API
    const config = {
      instanceId: data.instanceId,
      token: data.token,
      clientToken: data.clientToken,
    }

    const status = await getZApiConnectionStatus(config)

    // Nao exigir que esteja "connected" ainda — o user pode conectar depois via QR
    // Apenas validar que as credenciais sao validas (a chamada nao falhou)

    // 5. Atualizar inbox com dados Z-API
    await db.inbox.update({
      where: { id: inbox.id },
      data: {
        connectionType: 'Z_API',
        zapiInstanceId: data.instanceId,
        zapiToken: data.token,
        zapiClientToken: data.clientToken,
      },
    })

    // 6. Invalidar cache
    revalidateTag(`inbox:${inbox.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)

    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return {
      success: true,
      inboxId: inbox.id,
      connected: status.connected,
      phone: status.phone,
    }
  })

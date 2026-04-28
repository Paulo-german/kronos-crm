'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { disconnectInstagramSchema } from './schema'

export const disconnectInstagram = orgActionClient
  .schema(disconnectInstagramSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: somente OWNER e ADMIN podem alterar conexoes
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Validar inbox pertence a org
    const inbox = await db.inbox.findFirst({
      where: { id: data.inboxId, organizationId: ctx.orgId },
      select: {
        id: true,
        agentId: true,
        channel: true,
        connectionType: true,
        metaIgUserId: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    // 3. Validar que o inbox e do canal Instagram e tem conexao ativa
    if (inbox.channel !== 'INSTAGRAM_DM') {
      throw new Error('Esta caixa de entrada não é do tipo Instagram Direct.')
    }

    if (inbox.connectionType !== 'META_CLOUD' || !inbox.metaIgUserId) {
      throw new Error('Esta caixa de entrada não possui uma conexão Instagram ativa.')
    }

    // 4. Limpar dados Instagram e restaurar connectionType para EVOLUTION (sem conexao ativa)
    await db.inbox.update({
      where: { id: inbox.id },
      data: {
        connectionType: 'EVOLUTION',
        metaIgUserId: null,
        metaIgPageId: null,
        metaIgUsername: null,
        metaAccessToken: null,
      },
    })

    // 5. Invalidar cache
    revalidateTag(`inbox:${inbox.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)

    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return { success: true }
  })

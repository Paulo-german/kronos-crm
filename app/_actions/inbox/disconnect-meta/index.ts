'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { disconnectMetaSchema } from './schema'

export const disconnectMeta = orgActionClient
  .schema(disconnectMetaSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: somente OWNER e ADMIN podem alterar conexoes
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Validar inbox pertence a org e tem connectionType META_CLOUD
    const inbox = await db.inbox.findFirst({
      where: { id: data.inboxId, organizationId: ctx.orgId },
      select: {
        id: true,
        agentId: true,
        connectionType: true,
        metaPhoneNumberId: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (inbox.connectionType !== 'META_CLOUD' || !inbox.metaPhoneNumberId) {
      throw new Error('Esta caixa de entrada não possui uma conexão Meta WhatsApp ativa.')
    }

    // 3. Limpar dados Meta e restaurar connectionType para EVOLUTION (backward compat)
    await db.inbox.update({
      where: { id: inbox.id },
      data: {
        connectionType: 'EVOLUTION',
        metaWabaId: null,
        metaPhoneNumberId: null,
        metaAccessToken: null,
        metaPhoneDisplay: null,
      },
    })

    // 4. Invalidar cache
    revalidateTag(`inbox:${inbox.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)

    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return { success: true, inboxId: inbox.id }
  })

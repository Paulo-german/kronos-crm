'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { toggleReadStatusSchema } from './schema'

export const toggleReadStatus = orgActionClient
  .schema(toggleReadStatusSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: permissão para atualizar conversa
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    // 2. Buscar conversa — ownership check implícito via organizationId do ctx
    const conversation = await db.conversation.findFirst({
      where: { id: data.conversationId, organizationId: ctx.orgId },
      select: { id: true, unreadCount: true },
    })

    if (!conversation) throw new Error('Conversa não encontrada.')

    // 3. Toggle: se tem mensagens não lidas → zera. Se já lida → marca como não lida (1).
    const newUnreadCount = conversation.unreadCount > 0 ? 0 : 1

    await db.conversation.update({
      where: { id: data.conversationId },
      data: { unreadCount: newUnreadCount },
    })

    // 4. Invalidar cache da lista de conversas da org
    revalidateTag(`conversations:${ctx.orgId}`)

    return { success: true, unreadCount: newUnreadCount }
  })

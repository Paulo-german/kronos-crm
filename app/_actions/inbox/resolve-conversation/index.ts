'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, canAccessRecord, requirePermission } from '@/_lib/rbac'
import { resolveConversationSchema } from './schema'

export const resolveConversation = orgActionClient
  .schema(resolveConversationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: permissão base de atualização de conversa
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    // 2. Buscar conversa + validar pertence à org
    const conversation = await db.conversation.findFirst({
      where: { id: data.conversationId, organizationId: ctx.orgId },
      select: { id: true, status: true, assignedTo: true },
    })

    if (!conversation) {
      throw new Error('Conversa não encontrada.')
    }

    // RBAC: MEMBER só pode resolver conversas atribuídas a ele
    requirePermission(canAccessRecord(ctx, { assignedTo: conversation.assignedTo }))

    // 3. Idempotência: se já está RESOLVED, não há nada a fazer
    if (conversation.status === 'RESOLVED') {
      return { success: true, alreadyResolved: true }
    }

    // 4. Atualizar status para RESOLVED com rastreamento
    await db.conversation.update({
      where: { id: data.conversationId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: ctx.userId,
      },
    })

    // 5. Invalidar cache da lista e do detalhe da conversa
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation:${data.conversationId}`)

    return { success: true, alreadyResolved: false }
  })

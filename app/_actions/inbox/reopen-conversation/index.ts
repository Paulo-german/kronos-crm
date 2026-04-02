'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, canAccessRecord, requirePermission } from '@/_lib/rbac'
import { reopenConversationSchema } from './schema'

export const reopenConversation = orgActionClient
  .schema(reopenConversationSchema)
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

    // RBAC: MEMBER só pode reabrir conversas atribuídas a ele
    requirePermission(canAccessRecord(ctx, { assignedTo: conversation.assignedTo }))

    // 3. Idempotência: se já está OPEN, não há nada a fazer
    if (conversation.status === 'OPEN') {
      return { success: true, alreadyOpen: true }
    }

    // 4. Atualizar status para OPEN, limpando campos de resolução
    await db.conversation.update({
      where: { id: data.conversationId },
      data: {
        status: 'OPEN',
        resolvedAt: null,
        resolvedBy: null,
      },
    })

    // 5. Invalidar cache da lista e do detalhe da conversa
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation:${data.conversationId}`)

    return { success: true, alreadyOpen: false }
  })

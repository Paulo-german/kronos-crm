'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, canAccessRecord, requirePermission } from '@/_lib/rbac'
import { toggleConversationLabelSchema } from './schema'

const MAX_LABELS_PER_CONVERSATION = 5

export const toggleConversationLabel = orgActionClient
  .schema(toggleConversationLabelSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: permissão base de atualização de conversa
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    // 2. Validar conversa pertence à org + count de labels para limite
    const conversation = await db.conversation.findFirst({
      where: { id: data.conversationId, organizationId: ctx.orgId },
      select: { id: true, assignedTo: true, _count: { select: { labels: true } } },
    })

    if (!conversation) {
      throw new Error('Conversa não encontrada.')
    }

    // RBAC: MEMBER só pode alterar etiquetas de conversas atribuídas a ele
    requirePermission(canAccessRecord(ctx, { assignedTo: conversation.assignedTo }))

    // 3. Validar que a etiqueta pertence à mesma organização (segurança cross-org)
    const label = await db.conversationLabel.findFirst({
      where: { id: data.labelId, organizationId: ctx.orgId },
    })

    if (!label) {
      throw new Error('Etiqueta não encontrada.')
    }

    // 4. Toggle: verificar se o assignment já existe
    const existingAssignment = await db.conversationLabelAssignment.findUnique({
      where: {
        conversationId_labelId: {
          conversationId: data.conversationId,
          labelId: data.labelId,
        },
      },
    })

    if (existingAssignment) {
      await db.conversationLabelAssignment.delete({
        where: { id: existingAssignment.id },
      })
    } else {
      // Checar limite antes de adicionar nova etiqueta
      if (conversation._count.labels >= MAX_LABELS_PER_CONVERSATION) {
        throw new Error(`Limite de ${MAX_LABELS_PER_CONVERSATION} etiquetas por conversa atingido.`)
      }

      await db.conversationLabelAssignment.create({
        data: {
          conversationId: data.conversationId,
          labelId: data.labelId,
        },
      })
    }

    // 5. Invalidar cache da lista e do detalhe
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation:${data.conversationId}`)

    return { success: true, action: existingAssignment ? 'removed' : 'added' }
  })

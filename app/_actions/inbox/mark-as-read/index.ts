'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, canAccessRecord, requirePermission } from '@/_lib/rbac'
import { markAsReadSchema } from './schema'

export const markAsRead = orgActionClient
  .schema(markAsReadSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    const conversation = await db.conversation.findFirst({
      where: { id: data.conversationId, organizationId: ctx.orgId },
      select: { id: true, unreadCount: true, assignedTo: true },
    })

    if (!conversation) throw new Error('Conversa não encontrada.')

    requirePermission(canAccessRecord(ctx, { assignedTo: conversation.assignedTo }))

    if (conversation.unreadCount === 0) return { success: true }

    await db.conversation.update({
      where: { id: data.conversationId },
      data: { unreadCount: 0 },
    })

    revalidateTag(`conversations:${ctx.orgId}`)

    return { success: true }
  })

'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { endSimulatorConversationSchema } from './schema'

export const endSimulatorConversation = orgActionClient
  .schema(endSimulatorConversationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Guard: apenas super admins podem operar o simulador.
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { isSuperAdmin: true },
    })

    if (!user?.isSuperAdmin) {
      throw new Error('Acesso negado.')
    }

    requirePermission(canPerformAction(ctx, 'conversation', 'delete'))

    const conversation = await db.conversation.findFirst({
      where: { id: data.conversationId, organizationId: ctx.orgId },
      select: {
        id: true,
        contactId: true,
        dealId: true,
        inbox: { select: { connectionType: true } },
      },
    })

    if (!conversation) {
      throw new Error('Conversa não encontrada.')
    }

    if (conversation.inbox.connectionType !== 'SIMULATOR') {
      throw new Error('Esta action é exclusiva para conversas simuladas.')
    }

    // Cleanup completo: conversa + deal + contato. Inbox SIMULATOR permanece (singleton).
    // Ordem respeita FKs: conversa primeiro (remove ref ao deal), depois deal, depois contato.
    await db.$transaction(async (tx) => {
      await tx.conversation.delete({ where: { id: conversation.id } })
      if (conversation.dealId) {
        await tx.deal.delete({ where: { id: conversation.dealId } })
      }
      await tx.contact.delete({ where: { id: conversation.contactId } })
    })

    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation-messages:${conversation.id}`)
    revalidateTag(`contacts:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deals-options:${ctx.orgId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)
    revalidateTag(`dashboard-charts:${ctx.orgId}`)

    return { success: true }
  })

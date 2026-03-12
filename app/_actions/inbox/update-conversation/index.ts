'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { updateConversationSchema } from './schema'

export const updateConversation = orgActionClient
  .schema(updateConversationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    // 2. Buscar conversa existente
    const conversation = await db.conversation.findFirst({
      where: { id: data.conversationId, organizationId: ctx.orgId },
    })

    if (!conversation) {
      throw new Error('Conversa não encontrada.')
    }

    // 3. Validar dealId se fornecido
    if (data.dealId !== undefined && data.dealId !== null) {
      const deal = await db.deal.findFirst({
        where: { id: data.dealId, organizationId: ctx.orgId },
      })
      if (!deal) {
        throw new Error('Negociação não encontrada.')
      }
    }

    // 4. Validar contactId se fornecido
    if (data.contactId !== undefined) {
      const contact = await db.contact.findFirst({
        where: { id: data.contactId, organizationId: ctx.orgId },
      })
      if (!contact) {
        throw new Error('Contato não encontrado.')
      }

      // Checar constraint unique [inboxId, contactId, channel]
      const existing = await db.conversation.findFirst({
        where: {
          inboxId: conversation.inboxId,
          contactId: data.contactId,
          channel: conversation.channel,
          id: { not: conversation.id },
        },
      })
      if (existing) {
        throw new Error(
          'Já existe uma conversa com este contato neste inbox e canal.',
        )
      }
    }

    const oldDealId = conversation.dealId

    // 5. Update
    await db.conversation.update({
      where: { id: data.conversationId },
      data: {
        ...(data.dealId !== undefined && { dealId: data.dealId }),
        ...(data.contactId !== undefined && { contactId: data.contactId }),
      },
    })

    // 6. Invalidar cache
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation:${data.conversationId}`)
    revalidateTag(`conversation-messages:${data.conversationId}`)

    if (data.dealId !== undefined) {
      if (oldDealId) revalidateTag(`deal:${oldDealId}`)
      if (data.dealId) revalidateTag(`deal:${data.dealId}`)
    }

    return { success: true }
  })

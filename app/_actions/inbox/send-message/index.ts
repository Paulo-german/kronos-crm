'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { sendWhatsAppMessage } from '@/_lib/evolution/send-message'
import { sendMessageSchema } from './schema'

export const sendMessage = orgActionClient
  .schema(sendMessageSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    // 2. Validar conversa pertence à org
    const conversation = await db.conversation.findFirst({
      where: { id: data.conversationId, organizationId: ctx.orgId },
      include: {
        inbox: { select: { evolutionInstanceName: true } },
      },
    })

    if (!conversation) {
      throw new Error('Conversa não encontrada.')
    }

    if (!conversation.remoteJid || !conversation.inbox.evolutionInstanceName) {
      throw new Error('Esta conversa não possui conexão WhatsApp ativa.')
    }

    // 3. Enviar via WhatsApp
    await sendWhatsAppMessage(
      conversation.inbox.evolutionInstanceName,
      conversation.remoteJid,
      data.text,
    )

    // 4. Salvar mensagem no banco + pausar IA + resetar unreadCount
    await Promise.all([
      db.message.create({
        data: {
          conversationId: data.conversationId,
          role: 'assistant',
          content: data.text,
          metadata: {
            sentBy: ctx.userId,
            sentFrom: 'inbox',
          },
        },
      }),
      db.conversation.update({
        where: { id: data.conversationId },
        data: {
          aiPaused: true,
          pausedAt: new Date(),
          unreadCount: 0,
        },
      }),
    ])

    // 5. Invalidar cache
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation-messages:${data.conversationId}`)

    return { success: true }
  })

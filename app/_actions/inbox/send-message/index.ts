'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
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

    // 3. Buscar nome do remetente
    const sender = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { fullName: true, email: true },
    })
    const senderName = sender?.fullName || sender?.email || 'Membro'

    // 4. Enviar via WhatsApp
    const sentMessageIds = await sendWhatsAppMessage(
      conversation.inbox.evolutionInstanceName,
      conversation.remoteJid,
      data.text,
    )

    // Pré-registrar dedup keys para que o webhook fromMe ignore estas mensagens
    await Promise.all(
      sentMessageIds.map((sentId) =>
        redis.set(`dedup:${sentId}`, '1', 'EX', 300).catch(() => {}),
      ),
    )

    // 5. Salvar mensagem no banco + pausar IA + resetar unreadCount
    await Promise.all([
      db.message.create({
        data: {
          conversationId: data.conversationId,
          role: 'assistant',
          content: data.text,
          metadata: {
            sentBy: ctx.userId,
            sentByName: senderName,
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

    // 6. Invalidar cache
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation-messages:${data.conversationId}`)

    return { success: true }
  })

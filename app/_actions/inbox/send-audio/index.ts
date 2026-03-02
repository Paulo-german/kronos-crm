'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { sendWhatsAppAudio } from '@/_lib/evolution/send-audio'
import { sendAudioSchema } from './schema'

export const sendAudio = orgActionClient
  .schema(sendAudioSchema)
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
    const messageId = await sendWhatsAppAudio(
      conversation.inbox.evolutionInstanceName,
      conversation.remoteJid,
      data.audioBase64,
    )

    // Pré-registrar dedup key para que o webhook fromMe ignore esta mensagem
    await redis.set(`dedup:${messageId}`, '1', 'EX', 300).catch(() => {})

    // 5. Salvar mensagem no banco + pausar IA + resetar unreadCount
    const durationRounded = Math.round(data.duration)

    await Promise.all([
      db.message.create({
        data: {
          conversationId: data.conversationId,
          role: 'assistant',
          content: `[Áudio ${durationRounded}s]`,
          providerMessageId: messageId,
          metadata: {
            sentBy: ctx.userId,
            sentByName: senderName,
            sentFrom: 'inbox',
            media: {
              mimetype: 'audio/ogg',
              seconds: data.duration,
            },
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

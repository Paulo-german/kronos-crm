'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { withRetry } from '@/_lib/whatsapp/retry'
import { sendAudioSchema } from './schema'

export const sendAudio = orgActionClient
  .schema(sendAudioSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    // 2. Validar conversa pertence à org — incluir campos necessarios para routing
    const conversation = await db.conversation.findFirst({
      where: { id: data.conversationId, organizationId: ctx.orgId },
      include: {
        inbox: {
          select: {
            connectionType: true,
            evolutionInstanceName: true,
            metaPhoneNumberId: true,
            metaAccessToken: true,
            zapiInstanceId: true,
            zapiToken: true,
            zapiClientToken: true,
          },
        },
      },
    })

    if (!conversation) {
      throw new Error('Conversa não encontrada.')
    }

    if (!conversation.remoteJid) {
      throw new Error('Esta conversa não possui conexão WhatsApp ativa.')
    }

    const remoteJid = conversation.remoteJid

    // 3. Buscar nome do remetente
    const sender = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { fullName: true, email: true },
    })
    const senderName = sender?.fullName || sender?.email || 'Membro'

    // 4. Enviar via provider correto (Evolution ou Meta Cloud)
    const provider = resolveWhatsAppProvider(conversation.inbox)
    const messageId = await withRetry(() =>
      provider.sendAudio(remoteJid, data.audioBase64),
    )

    // Pré-registrar dedup key para que o webhook fromMe ignore esta mensagem
    await redis.set(`dedup:${messageId}`, '1', 'EX', 300).catch(() => {})

    // 5. Salvar mensagem no banco + pausar IA + resetar unreadCount + cancelar FUP ativo
    // O humano assumiu a conversa — FUP nao faz mais sentido
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
          // Reset follow-up: humano assumiu a conversa — cancelar ciclo pendente
          nextFollowUpAt: null,
          followUpCount: 0,
        },
      }),
    ])

    // 6. Invalidar cache
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation-messages:${data.conversationId}`)

    return { success: true }
  })

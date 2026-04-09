'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { canPerformAction, canAccessRecord, requirePermission } from '@/_lib/rbac'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { withRetry } from '@/_lib/whatsapp/retry'
import { parseProviderError } from '@/_lib/whatsapp/parse-provider-error'
import { AUTO_REOPEN_FIELDS } from '@/_lib/conversation/auto-reopen'
import { sendAudioSchema } from './schema'

export const sendAudio = orgActionClient
  .schema(sendAudioSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    // 2. Validar conversa pertence à org + ownership check para MEMBER
    const conversation = await db.conversation.findFirst({
      where: { id: data.conversationId, organizationId: ctx.orgId },
      include: {
        inbox: {
          select: {
            connectionType: true,
            evolutionInstanceName: true,
            evolutionApiUrl: true,
            evolutionApiKey: true,
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

    // RBAC: MEMBER so pode enviar audio para conversas atribuidas a ele
    requirePermission(canAccessRecord(ctx, { assignedTo: conversation.assignedTo }))

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

    // 4. Enviar via provider correto
    const provider = resolveWhatsAppProvider(conversation.inbox)
    const durationRounded = Math.round(data.duration)
    let sendFailed = false

    try {
      const messageId = await withRetry(() =>
        provider.sendAudio(remoteJid, data.audioBase64),
      )

      await redis.set(`dedup:${messageId}`, '1', 'EX', 300).catch(() => {})

      await Promise.all([
        db.message.create({
          data: {
            conversationId: data.conversationId,
            role: 'assistant',
            content: `[Áudio ${durationRounded}s]`,
            providerMessageId: messageId,
            deliveryStatus: 'sent',
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
            lastMessageRole: 'assistant',
            nextFollowUpAt: null,
            followUpCount: 0,
            ...AUTO_REOPEN_FIELDS,
          },
        }),
      ])
    } catch (providerError) {
      sendFailed = true

      const parsedError = parseProviderError(providerError)

      await db.message.create({
        data: {
          conversationId: data.conversationId,
          role: 'assistant',
          content: `[Áudio ${durationRounded}s]`,
          deliveryStatus: 'failed',
          metadata: {
            sentBy: ctx.userId,
            sentByName: senderName,
            sentFrom: 'inbox',
            media: {
              mimetype: 'audio/ogg',
              seconds: data.duration,
            },
            deliveryError: parsedError,
          },
        },
      })

      // 5. Invalidar cache
      revalidateTag(`conversations:${ctx.orgId}`)
      revalidateTag(`conversation-messages:${data.conversationId}`)

      return { success: true, sendFailed, errorMessage: parsedError.userMessage }
    }

    // 5. Invalidar cache
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation-messages:${data.conversationId}`)

    return { success: true, sendFailed, errorMessage: undefined }
  })

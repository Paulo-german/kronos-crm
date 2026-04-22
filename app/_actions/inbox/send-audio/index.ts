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
import { checkBalance } from '@/_lib/billing/credit-utils'
import { uploadMediaToB2 } from '@/_lib/b2/storage'
import { tasks } from '@trigger.dev/sdk/v3'
import type { transcribeOutboundMedia } from '@/../../trigger/transcribe-outbound-media'
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

    // 4. Verificar saldo antes do upload — se sem créditos, pula B2 e task (áudio ainda é entregue)
    const balance = await checkBalance(ctx.orgId)
    const hasCredits = balance.available >= 1

    // 5. Gerar messageId explícito para vincular upload B2 à mensagem antes de criá-la
    const messageId = crypto.randomUUID()

    // 6. Upload B2 (apenas se há créditos — sem créditos não há transcrição, logo B2 é dispensável)
    let mediaUrl: string | undefined
    if (hasCredits) {
      try {
        const uploadResult = await uploadMediaToB2({
          organizationId: ctx.orgId,
          conversationId: data.conversationId,
          messageId,
          base64: data.audioBase64,
          mimetype: 'audio/ogg',
        })
        mediaUrl = uploadResult.publicUrl
      } catch {
        // B2 falhou: manter comportamento atual (sem replay, sem transcrição).
        // Áudio continua sendo entregue ao cliente — não bloqueia fluxo de negócio.
      }
    }

    // 7. Enviar via provider correto
    const provider = resolveWhatsAppProvider(conversation.inbox)
    const durationRounded = Math.round(data.duration)
    let sendFailed = false

    try {
      const providerMessageId = await withRetry(() =>
        provider.sendAudio(remoteJid, data.audioBase64),
      )

      await redis.set(`dedup:${providerMessageId}`, '1', 'EX', 300).catch(() => {})

      const createdMessage = await db.message.create({
        data: {
          id: messageId,
          conversationId: data.conversationId,
          role: 'assistant',
          content: `[Áudio ${durationRounded}s]`,
          providerMessageId,
          deliveryStatus: 'sent',
          metadata: {
            sentBy: ctx.userId,
            sentByName: senderName,
            sentFrom: 'inbox',
            media: {
              mimetype: 'audio/ogg',
              seconds: data.duration,
              // URL persistida apenas quando upload B2 teve sucesso
              ...(mediaUrl ? { url: mediaUrl, storedExternally: true } : {}),
            },
          },
        },
        select: { id: true },
      })

      await db.conversation.update({
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
      })

      // 8. Disparar task de transcrição apenas se o B2 upload teve sucesso
      // (task precisa de mediaUrl para baixar o áudio no worker)
      if (mediaUrl) {
        void tasks.trigger<typeof transcribeOutboundMedia>('transcribe-outbound-media', {
          messageId: createdMessage.id,
          conversationId: data.conversationId,
          organizationId: ctx.orgId,
          mediaUrl,
          mimetype: 'audio/ogg',
        })
      }
    } catch (providerError) {
      sendFailed = true

      const parsedError = parseProviderError(providerError)

      await db.message.create({
        data: {
          id: messageId,
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

      // Invalidar cache antes de retornar erro
      revalidateTag(`conversations:${ctx.orgId}`)
      revalidateTag(`conversation-messages:${data.conversationId}`)

      return { success: true, sendFailed, errorMessage: parsedError.userMessage }
    }

    // 9. Invalidar cache
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation-messages:${data.conversationId}`)

    return { success: true, sendFailed, errorMessage: undefined }
  })

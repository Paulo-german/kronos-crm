'use server'

import { revalidateTag } from 'next/cache'
import { tasks } from '@trigger.dev/sdk/v3'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { canPerformAction, canAccessRecord, requirePermission } from '@/_lib/rbac'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { uploadMediaToB2 } from '@/_lib/b2/storage'
import {
  ALL_ACCEPTED_MEDIA_TYPES,
  isImageMimetype,
  isVideoMimetype,
  getMaxSizeForMimetype,
} from '@/_lib/whatsapp/media-constants'
import { withRetry } from '@/_lib/whatsapp/retry'
import { parseProviderError } from '@/_lib/whatsapp/parse-provider-error'
import { AUTO_REOPEN_FIELDS } from '@/_lib/conversation/auto-reopen'
import { prefixAttendantName } from '@/_lib/inbox/prefix-attendant-name'
import { extractPdfText, PDF_NO_TEXT_EXTRACTED } from '@/_lib/media/extract-pdf-text'
import { sendMediaSchema } from './schema'
import type { transcribeOutboundMedia } from '@/../../trigger/transcribe-outbound-media'

export const sendMedia = orgActionClient
  .schema(sendMediaSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    // 2. Validar mimetype
    if (!ALL_ACCEPTED_MEDIA_TYPES.includes(data.mimetype)) {
      throw new Error('Tipo de arquivo não suportado.')
    }

    // 3. Validar tamanho (base64 é ~33% maior que o binário)
    const estimatedBytes = Math.ceil(data.mediaBase64.length * 0.75)
    const maxSize = getMaxSizeForMimetype(data.mimetype)
    if (estimatedBytes > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024))
      throw new Error(`Arquivo muito grande. Máximo: ${maxMB}MB.`)
    }

    // 4. Validar conversa pertence à org + ownership check para MEMBER
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
            showAttendantName: true,
          },
        },
      },
    })

    if (!conversation) {
      throw new Error('Conversa não encontrada.')
    }

    // RBAC: MEMBER so pode enviar midia para conversas atribuidas a ele
    requirePermission(canAccessRecord(ctx, { assignedTo: conversation.assignedTo }))

    if (!conversation.remoteJid) {
      throw new Error('Esta conversa não possui conexão WhatsApp ativa.')
    }

    const remoteJid = conversation.remoteJid

    // 5. Buscar nome do remetente
    const sender = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { fullName: true, email: true },
    })
    const senderName = sender?.fullName || sender?.email || 'Membro'

    // 6. Gerar messageId, determinar mediatype e fazer upload para B2
    const messageId = crypto.randomUUID()
    const mediatype = isImageMimetype(data.mimetype)
      ? 'image' as const
      : isVideoMimetype(data.mimetype)
        ? 'video' as const
        : 'document' as const

    const uploadResult = await uploadMediaToB2({
      organizationId: ctx.orgId,
      conversationId: data.conversationId,
      messageId,
      base64: data.mediaBase64,
      mimetype: data.mimetype,
      fileName: data.fileName,
    })

    // 7. Extrair texto do PDF inline (~50ms)
    // Se escaneado (sem texto), será enviado para vision AI via Trigger.dev
    let mediaTranscription: string | undefined
    let pdfNeedsVision = false
    if (data.mimetype === 'application/pdf') {
      try {
        const extracted = await extractPdfText(data.mediaBase64)
        if (extracted === PDF_NO_TEXT_EXTRACTED) {
          pdfNeedsVision = true
        } else {
          mediaTranscription = extracted
        }
      } catch {
        // Falha na extração não impede o envio
      }
    }

    // 8. Enviar via provider com retry
    const provider = resolveWhatsAppProvider(conversation.inbox)
    const contentFallback = mediatype === 'image'
      ? '[Imagem]'
      : mediatype === 'video'
        ? '[Vídeo]'
        : `[Documento: ${data.fileName}]`
    const content = data.caption || contentFallback
    let sendFailed = false

    const captionToSend = data.caption
      ? prefixAttendantName(data.caption, senderName, conversation.inbox.showAttendantName)
      : undefined

    try {
      const providerMessageId = await withRetry(() =>
        provider.sendMedia(
          remoteJid,
          data.mediaBase64,
          data.mimetype,
          mediatype,
          data.fileName,
          captionToSend,
          uploadResult.publicUrl,
        ),
      )

      await redis.set(`dedup:${providerMessageId}`, '1', 'EX', 300).catch(() => {})

      await Promise.all([
        db.message.create({
          data: {
            id: messageId,
            conversationId: data.conversationId,
            role: 'assistant',
            content,
            providerMessageId,
            deliveryStatus: 'sent',
            metadata: {
              sentBy: ctx.userId,
              sentByName: senderName,
              sentFrom: 'inbox',
              media: {
                mimetype: data.mimetype,
                fileName: data.fileName,
                url: uploadResult.publicUrl,
                storedExternally: true,
              },
              ...(mediaTranscription && { mediaTranscription }),
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
          id: messageId,
          conversationId: data.conversationId,
          role: 'assistant',
          content,
          deliveryStatus: 'failed',
          metadata: {
            sentBy: ctx.userId,
            sentByName: senderName,
            sentFrom: 'inbox',
            media: {
              mimetype: data.mimetype,
              fileName: data.fileName,
              url: uploadResult.publicUrl,
              storedExternally: true,
            },
            ...(mediaTranscription && { mediaTranscription }),
            deliveryError: parsedError,
          },
        },
      })

      // 8. Invalidar cache
      revalidateTag(`conversations:${ctx.orgId}`)
      revalidateTag(`conversation-messages:${data.conversationId}`)

      return { success: true, sendFailed, errorMessage: parsedError.userMessage }
    }

    // 8. Invalidar cache
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation-messages:${data.conversationId}`)

    // 10. Disparar transcrição async (fire-and-forget)
    // Imagem: sempre async | PDF escaneado: fallback para vision AI
    if (mediatype === 'image' || pdfNeedsVision) {
      void tasks.trigger<typeof transcribeOutboundMedia>(
        'transcribe-outbound-media',
        {
          messageId,
          conversationId: data.conversationId,
          organizationId: ctx.orgId,
          mediaUrl: uploadResult.publicUrl,
          mimetype: data.mimetype,
          caption: data.caption,
        },
      )
    }

    return { success: true, sendFailed, errorMessage: undefined }
  })

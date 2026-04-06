'use server'

import { revalidateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { canPerformAction, canAccessRecord, requirePermission } from '@/_lib/rbac'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { withRetry } from '@/_lib/whatsapp/retry'
import { AUTO_REOPEN_FIELDS } from '@/_lib/conversation/auto-reopen'
import { isImageMimetype, isVideoMimetype } from '@/_lib/whatsapp/media-constants'
import { getInboxMetaCredentials } from '@/_data-access/inbox/get-inbox-meta-credentials'
import { sendMetaTemplateMessage } from '@/_lib/meta/template-api'
import type { MetaTemplateSendComponent } from '@/_lib/meta/types'
import { retryFailedMessageSchema } from './schema'

interface MessageMetadata {
  sentBy?: string
  sentByName?: string
  sentFrom?: string
  template?: {
    name: string
    language: string
    headerParameters?: Array<{ type: string; text: string }>
    bodyParameters?: Array<{ type: string; text: string }>
  }
  media?: {
    mimetype?: string
    fileName?: string
    url?: string
    storedExternally?: boolean
    seconds?: number
  }
  deliveryError?: Record<string, unknown>
}

/**
 * Reenvia uma mensagem que falhou no envio original.
 * Determina o tipo pelo metadata e usa o provider correto.
 */
export const retryFailedMessage = orgActionClient
  .schema(retryFailedMessageSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    // 1. Buscar mensagem failed com conversa + inbox
    const message = await db.message.findFirst({
      where: {
        id: data.messageId,
        deliveryStatus: 'failed',
        conversation: { organizationId: ctx.orgId },
      },
      select: {
        id: true,
        content: true,
        metadata: true,
        conversation: {
          select: {
            id: true,
            remoteJid: true,
            assignedTo: true,
            inbox: {
              select: {
                id: true,
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
        },
      },
    })

    if (!message) {
      throw new Error('Mensagem não encontrada ou não está com status de falha.')
    }

    const { conversation } = message

    // RBAC: MEMBER so pode reenviar mensagens de conversas atribuidas a ele
    requirePermission(canAccessRecord(ctx, { assignedTo: conversation.assignedTo }))

    if (!conversation.remoteJid) {
      throw new Error('Esta conversa não possui conexão WhatsApp ativa.')
    }

    const remoteJid = conversation.remoteJid
    const metadata = (message.metadata as MessageMetadata) ?? {}

    // 2. Determinar tipo e reenviar
    let providerMessageId: string

    if (metadata.template) {
      // Template message — so META_CLOUD
      providerMessageId = await retryTemplate(
        conversation.inbox.id,
        ctx.orgId,
        remoteJid,
        metadata.template,
      )
    } else if (metadata.media?.url && metadata.media.mimetype !== 'audio/ogg') {
      // Media message com B2 URL disponivel
      const provider = resolveWhatsAppProvider(conversation.inbox)
      const mimetype = metadata.media.mimetype ?? 'application/octet-stream'
      const mediatype = isImageMimetype(mimetype)
        ? 'image' as const
        : isVideoMimetype(mimetype)
          ? 'video' as const
          : 'document' as const

      // Para Meta Cloud, precisamos do base64 (fetch do B2)
      let mediaBase64 = ''
      if (conversation.inbox.connectionType === 'META_CLOUD' && metadata.media.url) {
        const response = await fetch(metadata.media.url)
        const buffer = await response.arrayBuffer()
        mediaBase64 = Buffer.from(buffer).toString('base64')
      }

      const messageIds = await withRetry(() =>
        provider.sendMedia(
          remoteJid,
          mediaBase64,
          mimetype,
          mediatype,
          metadata.media?.fileName,
          message.content.startsWith('[') ? undefined : message.content,
          metadata.media?.url,
        ),
      )
      providerMessageId = messageIds
    } else if (metadata.media?.mimetype === 'audio/ogg') {
      throw new Error('Retry de áudio não é suportado. Regrave o áudio para reenviar.')
    } else {
      // Text message
      const provider = resolveWhatsAppProvider(conversation.inbox)
      const sentIds = await withRetry(() =>
        provider.sendText(remoteJid, message.content),
      )
      providerMessageId = sentIds[sentIds.length - 1]
    }

    // 3. Dedup Redis
    await redis.set(`dedup:${providerMessageId}`, '1', 'EX', 300).catch(() => {})

    // 4. Atualizar mensagem: marcar como enviada + limpar erro
    const currentMeta = (message.metadata as Record<string, unknown>) ?? {}
    const cleanMeta = Object.fromEntries(
      Object.entries(currentMeta).filter(([key]) => key !== 'deliveryError'),
    )

    await Promise.all([
      db.message.update({
        where: { id: message.id },
        data: {
          providerMessageId,
          deliveryStatus: 'sent',
          metadata: cleanMeta as Prisma.InputJsonValue,
        },
      }),
      // Aplicar side effects que nao ocorreram no envio original
      db.conversation.update({
        where: { id: conversation.id },
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

    // 5. Invalidar cache
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation-messages:${conversation.id}`)

    return { success: true }
  })

/**
 * Reenvia template message via Meta Graph API.
 * Reconstroi os componentes a partir do metadata salvo.
 */
async function retryTemplate(
  inboxId: string,
  orgId: string,
  remoteJid: string,
  template: NonNullable<MessageMetadata['template']>,
): Promise<string> {
  const credentials = await getInboxMetaCredentials(inboxId, orgId)
  if (!credentials) {
    throw new Error('Credenciais Meta Cloud não configuradas para este inbox.')
  }

  const recipientPhone = remoteJid.replace('@s.whatsapp.net', '')

  const components: MetaTemplateSendComponent[] = []
  if (template.headerParameters && template.headerParameters.length > 0) {
    components.push({
      type: 'header',
      parameters: template.headerParameters.map((param) => ({ type: 'text' as const, text: param.text })),
    })
  }
  if (template.bodyParameters && template.bodyParameters.length > 0) {
    components.push({
      type: 'body',
      parameters: template.bodyParameters.map((param) => ({ type: 'text' as const, text: param.text })),
    })
  }

  return withRetry(() =>
    sendMetaTemplateMessage(
      credentials.phoneNumberId,
      credentials.accessToken,
      recipientPhone,
      template.name,
      template.language,
      components.length > 0 ? components : undefined,
    ),
  )
}

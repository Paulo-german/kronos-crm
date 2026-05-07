'use server'

import { revalidateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { MessageDeliveryStatus } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, canAccessRecord, requirePermission } from '@/_lib/rbac'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { withRetry } from '@/_lib/whatsapp/retry'
import { parseProviderError } from '@/_lib/whatsapp/parse-provider-error'
import { editMessageSchema } from './schema'

const ALLOWED_DELIVERY_STATUSES: ReadonlySet<MessageDeliveryStatus> = new Set([
  MessageDeliveryStatus.sent,
  MessageDeliveryStatus.delivered,
  MessageDeliveryStatus.read,
])

/**
 * Edita o texto de uma mensagem ja enviada pela equipe via inbox.
 * Propaga a edicao ao provider (Evolution ou Z-API) antes de persistir no banco,
 * garantindo que o banco so reflete o que o WhatsApp efetivamente aceitou.
 */
export const editMessage = orgActionClient
  .schema(editMessageSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    const message = await db.message.findFirst({
      where: {
        id: data.messageId,
        isArchived: false,
        conversation: { organizationId: ctx.orgId },
      },
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        deliveryStatus: true,
        providerMessageId: true,
        createdAt: true,
        conversation: {
          select: {
            id: true,
            remoteJid: true,
            assignedTo: true,
            inbox: {
              select: {
                connectionType: true,
                channel: true,
                evolutionInstanceName: true,
                evolutionApiUrl: true,
                evolutionApiKey: true,
                metaPhoneNumberId: true,
                metaAccessToken: true,
                metaIgUserId: true,
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
      throw new Error('Mensagem não encontrada.')
    }

    const { conversation } = message

    requirePermission(canAccessRecord(ctx, { assignedTo: conversation.assignedTo }))

    if (message.role !== 'assistant') {
      throw new Error('Apenas mensagens enviadas pela equipe podem ser editadas.')
    }

    const meta = (message.metadata as Record<string, unknown> | null) ?? {}

    // Bloquear apenas echoes do celular; IA não tem sentFrom e também deve ser editável
    if (meta.sentFrom === 'whatsapp_phone') {
      throw new Error('Mensagens enviadas pelo celular não podem ser editadas pela plataforma.')
    }

    if (meta.media) {
      throw new Error('Mensagens com mídia não podem ser editadas.')
    }

    if (meta.template) {
      throw new Error('Templates não podem ser editados.')
    }

    if (!message.deliveryStatus || !ALLOWED_DELIVERY_STATUSES.has(message.deliveryStatus)) {
      throw new Error('Apenas mensagens entregues podem ser editadas.')
    }

    if (!message.providerMessageId) {
      throw new Error('ID da mensagem no provedor não encontrado.')
    }

    if (!conversation.remoteJid) {
      throw new Error('Esta conversa não possui conexão WhatsApp ativa.')
    }

    const remoteJid = conversation.remoteJid
    const providerMessageId = message.providerMessageId

    const provider = resolveWhatsAppProvider(conversation.inbox)

    try {
      await withRetry(() => provider.editText(remoteJid, providerMessageId, data.newText))
    } catch (providerError) {
      const parsed = parseProviderError(providerError)
      return { success: false as const, errorMessage: parsed.userMessage }
    }

    // Persiste apenas apos o provider confirmar a edicao
    const now = new Date()
    const editHistory = Array.isArray(meta.editHistory) ? meta.editHistory : []
    const updatedMetadata: Record<string, unknown> = {
      ...meta,
      editedAt: now.toISOString(),
      editHistory: [
        ...editHistory,
        { content: message.content, editedAt: now.toISOString() },
      ],
    }

    await db.message.update({
      where: { id: message.id },
      data: {
        content: data.newText,
        metadata: updatedMetadata as Prisma.InputJsonValue,
      },
    })

    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation-messages:${conversation.id}`)

    return { success: true as const }
  })

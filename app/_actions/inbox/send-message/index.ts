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
import { prefixAttendantName } from '@/_lib/inbox/prefix-attendant-name'
import { sendInstagramText } from '@/_lib/instagram/send-instagram-message'
import { IG_CONVERSATION_WINDOW_MS, IG_HUMAN_AGENT_WINDOW_MS } from '@/_lib/instagram/constants'
import { sendMessageSchema } from './schema'

export const sendMessage = orgActionClient
  .schema(sendMessageSchema)
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
            showAttendantName: true,
          },
        },
      },
    })

    if (!conversation) {
      throw new Error('Conversa não encontrada.')
    }

    // RBAC: MEMBER so pode enviar mensagens para conversas atribuidas a ele
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

    // 4. Enviar via provider correto (Evolution ou Meta Cloud)
    const textToSend = prefixAttendantName(data.text, senderName, conversation.inbox.showAttendantName)
    let sendFailed = false

    // Verificação de janela de mensagem para Instagram Direct (regra da Meta Graph API)
    if (conversation.inbox.channel === 'INSTAGRAM_DM') {
      const lastCustomerMessageAt = conversation.lastCustomerMessageAt

      if (!lastCustomerMessageAt) {
        return {
          success: false,
          errorMessage: 'Aguarde o cliente enviar uma mensagem para iniciar a conversa.',
        }
      }

      const elapsed = Date.now() - lastCustomerMessageAt.getTime()
      const isWithin24h = elapsed < IG_CONVERSATION_WINDOW_MS
      const isWithin7d = elapsed < IG_HUMAN_AGENT_WINDOW_MS

      if (!isWithin7d) {
        return {
          success: false,
          errorMessage: 'Não é possível responder. A janela de 7 dias expirou — o cliente precisa enviar uma nova mensagem.',
        }
      }

      if (!isWithin24h && !data.useHumanAgentTag) {
        return {
          success: false,
          errorMessage: 'Janela de 24h expirada. Use a opção "Resposta humana" para responder em até 7 dias.',
        }
      }
    }

    try {
      let sentMessageIds: string[]

      // Instagram Direct requer parâmetros extras (humanAgentTag) que a interface WhatsAppProvider não expõe.
      // Chamamos sendInstagramText diretamente para evitar estender a abstração genérica apenas por um caso específico.
      if (conversation.inbox.channel === 'INSTAGRAM_DM') {
        const igUserId = conversation.inbox.metaIgUserId
        const accessToken = conversation.inbox.metaAccessToken

        if (!igUserId || !accessToken) {
          throw new Error('Instagram Direct não configurado corretamente. Reconecte a conta.')
        }

        const recipientPsid = remoteJid.replace('@instagram', '')
        sentMessageIds = await withRetry(() =>
          sendInstagramText(igUserId, accessToken, recipientPsid, textToSend, {
            humanAgentTag: data.useHumanAgentTag,
          }),
        )
      } else {
        const provider = resolveWhatsAppProvider(conversation.inbox)
        sentMessageIds = await withRetry(() =>
          provider.sendText(remoteJid, textToSend),
        )
      }

      await Promise.all(
        sentMessageIds.map((sentId) =>
          redis.set(`dedup:${sentId}`, '1', 'EX', 300).catch(() => {}),
        ),
      )

      const lastSentId = sentMessageIds[sentMessageIds.length - 1]

      await Promise.all([
        db.message.create({
          data: {
            conversationId: data.conversationId,
            role: 'assistant',
            content: textToSend,
            providerMessageId: lastSentId,
            deliveryStatus: 'sent',
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
          content: textToSend,
          deliveryStatus: 'failed',
          metadata: {
            sentBy: ctx.userId,
            sentByName: senderName,
            sentFrom: 'inbox',
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

'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { withRetry } from '@/_lib/whatsapp/retry'
import { sendMessageSchema } from './schema'

export const sendMessage = orgActionClient
  .schema(sendMessageSchema)
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
    const sentMessageIds = await withRetry(() =>
      provider.sendText(remoteJid, data.text),
    )

    // Pré-registrar dedup keys para que o webhook fromMe ignore estas mensagens
    await Promise.all(
      sentMessageIds.map((sentId) =>
        redis.set(`dedup:${sentId}`, '1', 'EX', 300).catch(() => {}),
      ),
    )

    // 5. Salvar mensagem no banco + pausar IA + resetar unreadCount + cancelar FUP ativo
    // O humano assumiu a conversa — FUP nao faz mais sentido
    const lastSentId = sentMessageIds[sentMessageIds.length - 1]

    await Promise.all([
      db.message.create({
        data: {
          conversationId: data.conversationId,
          role: 'assistant',
          content: data.text,
          providerMessageId: lastSentId,
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

'use server'

import { revalidateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { canPerformAction, requirePermission } from '@/_lib/rbac/guards'
import { getInboxMetaCredentials } from '@/_data-access/inbox/get-inbox-meta-credentials'
import { sendMetaTemplateMessage } from '@/_lib/meta/template-api'
import type { MetaTemplateSendComponent } from '@/_lib/meta/types'
import { sendTemplateMessageSchema } from './schema'

/**
 * Action para enviar uma template message via Meta Graph API.
 * Segue o mesmo padrao de sendMessage: pausa IA, salva no banco, invalida cache.
 */
export const sendTemplateMessage = orgActionClient
  .schema(sendTemplateMessageSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    // 2. Validar conversa pertence à org — incluir inbox com credenciais Meta
    const conversation = await db.conversation.findFirst({
      where: { id: data.conversationId, organizationId: ctx.orgId },
      select: {
        remoteJid: true,
        inbox: {
          select: {
            id: true,
            connectionType: true,
            metaPhoneNumberId: true,
            metaAccessToken: true,
          },
        },
      },
    })

    if (!conversation) {
      throw new Error('Conversa não encontrada.')
    }

    // 3. Validar que possui remoteJid (numero de destino)
    if (!conversation.remoteJid) {
      throw new Error('Esta conversa não possui conexão WhatsApp ativa.')
    }

    const remoteJid = conversation.remoteJid

    // 4. Validar que o inbox é META_CLOUD
    if (conversation.inbox.connectionType !== 'META_CLOUD') {
      throw new Error('Templates só podem ser enviados em inboxes Meta Cloud API.')
    }

    // 5. Buscar credenciais via data-access seguro
    const credentials = await getInboxMetaCredentials(conversation.inbox.id, ctx.orgId)

    if (!credentials) {
      throw new Error('Credenciais Meta Cloud não configuradas para este inbox.')
    }

    // 6. Buscar nome do remetente
    const sender = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { fullName: true, email: true },
    })
    const senderName = sender?.fullName ?? sender?.email ?? 'Membro'

    // 7. Montar componentes para a Graph API
    const components: MetaTemplateSendComponent[] = []

    if (data.headerParameters && data.headerParameters.length > 0) {
      components.push({
        type: 'header',
        parameters: data.headerParameters,
      })
    }

    if (data.bodyParameters && data.bodyParameters.length > 0) {
      components.push({
        type: 'body',
        parameters: data.bodyParameters,
      })
    }

    // Normalizar o numero do destinatario (remover @s.whatsapp.net)
    const recipientPhone = remoteJid.replace('@s.whatsapp.net', '')

    // 8. Enviar template via Graph API
    const wamid = await sendMetaTemplateMessage(
      credentials.phoneNumberId,
      credentials.accessToken,
      recipientPhone,
      data.templateName,
      data.language,
      components.length > 0 ? components : undefined,
    )

    // 9. Dedup: prevenir que o webhook processe esta mensagem como entrada do cliente
    await redis.set(`dedup:${wamid}`, '1', 'EX', 300).catch(() => {})

    // 10. Montar conteudo textual para exibicao no chat
    const bodyParams = data.bodyParameters?.map((param) => param.text) ?? []
    const templateContent =
      bodyParams.length > 0
        ? `[Template: ${data.templateName}] ${bodyParams.join(' | ')}`
        : `[Template: ${data.templateName}]`

    // 11. Salvar mensagem + pausar IA + resetar unreadCount + cancelar FUP
    const templateMetadata = {
      sentBy: ctx.userId,
      sentByName: senderName,
      sentFrom: 'inbox' as const,
      template: {
        name: data.templateName,
        language: data.language,
        headerParameters: data.headerParameters,
        bodyParameters: data.bodyParameters,
      },
    }

    await Promise.all([
      db.message.create({
        data: {
          conversationId: data.conversationId,
          role: 'assistant',
          content: templateContent,
          providerMessageId: wamid,
          metadata: templateMetadata as unknown as Prisma.InputJsonValue,
        },
      }),
      db.conversation.update({
        where: { id: data.conversationId },
        data: {
          aiPaused: true,
          pausedAt: new Date(),
          unreadCount: 0,
          // Humano assumiu a conversa — cancelar ciclo de follow-up pendente
          nextFollowUpAt: null,
          followUpCount: 0,
        },
      }),
    ])

    // 12. Invalidar cache
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation-messages:${data.conversationId}`)

    return { success: true }
  })

'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { sendWhatsAppMessage } from '@/_lib/evolution/send-message'
import { sendMessageSchema } from './schema'

export const sendMessage = orgActionClient
  .schema(sendMessageSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    // 2. Validar conversa pertence à org
    const conversation = await db.agentConversation.findFirst({
      where: { id: data.conversationId, organizationId: ctx.orgId },
      include: {
        agent: { select: { evolutionInstanceName: true } },
      },
    })

    if (!conversation) {
      throw new Error('Conversa não encontrada.')
    }

    if (!conversation.remoteJid || !conversation.agent.evolutionInstanceName) {
      throw new Error('Esta conversa não possui conexão WhatsApp ativa.')
    }

    // 3. Enviar via WhatsApp
    await sendWhatsAppMessage(
      conversation.agent.evolutionInstanceName,
      conversation.remoteJid,
      data.text,
    )

    // 4. Salvar mensagem no banco
    await db.agentMessage.create({
      data: {
        conversationId: data.conversationId,
        role: 'assistant',
        content: data.text,
        metadata: {
          sentBy: ctx.userId,
          sentFrom: 'inbox',
        },
      },
    })

    // 5. Pausar IA (humano assumiu o controle)
    await db.agentConversation.update({
      where: { id: data.conversationId },
      data: { aiPaused: true, pausedAt: new Date() },
    })

    // 6. Invalidar cache
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation-messages:${data.conversationId}`)

    return { success: true }
  })

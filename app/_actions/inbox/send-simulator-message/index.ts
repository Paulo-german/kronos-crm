'use server'

import crypto from 'crypto'
import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { canPerformAction, canAccessRecord, requirePermission } from '@/_lib/rbac'
import { AUTO_REOPEN_FIELDS } from '@/_lib/conversation/auto-reopen'
import { resolveAgentForConversation } from '@/../trigger/lib/resolve-agent'
import { tasks } from '@trigger.dev/sdk/v3'
import type { processAgentMessage } from '@/../../trigger/process-agent-message'
import { sendSimulatorMessageSchema } from './schema'

// JID fictício — consistente com o criado pela create-simulator-conversation action
const SIMULATOR_REMOTE_JID = 'simulator@s.whatsapp.net'

// Número virtual do contato simulador — consistente com o criado na create-simulator-conversation action
const SIMULATOR_CONTACT_PHONE = 'simulator'

export const sendSimulatorMessage = orgActionClient
  .schema(sendSimulatorMessageSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Guard adicional: apenas super admins podem usar o simulador.
    // orgActionClient fornece ctx.orgId e ctx.userRole necessários para RBAC.
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { isSuperAdmin: true },
    })

    if (!user?.isSuperAdmin) {
      throw new Error('Acesso negado.')
    }

    // 1. RBAC: verificar permissão de atualização de conversa
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    // 2. Validar conversa pertence à org + buscar contexto do inbox
    const conversation = await db.conversation.findFirst({
      where: { id: data.conversationId, organizationId: ctx.orgId },
      select: {
        id: true,
        assignedTo: true,
        activeAgentId: true,
        inbox: {
          select: {
            id: true,
            connectionType: true,
            agentId: true,
            agentGroupId: true,
            agent: {
              select: {
                id: true,
                isActive: true,
                debounceSeconds: true,
                businessHoursEnabled: true,
                businessHoursTimezone: true,
                businessHoursConfig: true,
                outOfHoursMessage: true,
              },
            },
            agentGroup: {
              select: {
                id: true,
                isActive: true,
                members: {
                  select: {
                    agent: {
                      select: {
                        id: true,
                        isActive: true,
                        debounceSeconds: true,
                        businessHoursEnabled: true,
                        businessHoursTimezone: true,
                        businessHoursConfig: true,
                        outOfHoursMessage: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!conversation) {
      throw new Error('Conversa não encontrada.')
    }

    // RBAC: MEMBER só pode interagir com conversas atribuídas a ele
    requirePermission(canAccessRecord(ctx, { assignedTo: conversation.assignedTo }))

    // 3. Guard exclusivo do simulador: impedir uso da action em conversas reais
    if (conversation.inbox.connectionType !== 'SIMULATOR') {
      throw new Error('Esta action é exclusiva para conversas simuladas.')
    }

    const conversationId = conversation.id

    // 4. Salvar mensagem do usuário com ID único para dedup
    // Prefixo 'sim_' distingue IDs simulados de IDs reais de providers WhatsApp
    const providerMessageId = `sim_${crypto.randomUUID()}`

    await db.message.create({
      data: {
        conversationId,
        role: 'user',
        content: data.text,
        providerMessageId,
      },
    })

    // 5. Atualizar conversa: sinalizar mensagem do cliente + reabrir se estava resolvida
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageRole: 'user',
        unreadCount: { increment: 1 },
        lastCustomerMessageAt: new Date(),
        nextFollowUpAt: null,
        followUpCount: 0,
        ...AUTO_REOPEN_FIELDS,
      },
    })

    // 6. Resolver agente responsável pela conversa (suporta standalone e grupos)
    const resolvedAgent = await resolveAgentForConversation(conversation.inbox, {
      id: conversationId,
      activeAgentId: conversation.activeAgentId,
    })

    if (resolvedAgent?.isActive) {
      // No simulador não há debounce — o usuário quer resposta imediata para fins de teste.
      // Setar debounce com TTL de 60s para que o processAgentMessage passe na verificação,
      // mas sem delay na trigger (omitindo a opção { delay: '...s' }).
      const debounceTimestamp = Date.now()

      await redis
        .set(`debounce:${conversationId}`, String(debounceTimestamp), 'EX', 60)
        .catch(() => {
          // Falha no Redis não deve bloquear o simulador — o processAgentMessage trata
        })

      await tasks.trigger<typeof processAgentMessage>(
        'process-agent-message',
        {
          message: {
            messageId: providerMessageId,
            remoteJid: SIMULATOR_REMOTE_JID,
            phoneNumber: SIMULATOR_CONTACT_PHONE,
            pushName: 'Simulador',
            fromMe: false,
            timestamp: Math.floor(Date.now() / 1000),
            type: 'text',
            text: data.text,
            media: null,
            // instanceName fictício: identifica o inbox sem colisão com instâncias reais
            instanceName: `sim_${conversation.inbox.id}`,
            provider: 'simulator',
          },
          agentId: resolvedAgent.agentId,
          conversationId,
          organizationId: ctx.orgId,
          debounceTimestamp,
          requiresRouting: resolvedAgent.requiresRouting,
          groupId: resolvedAgent.groupId,
        },
      )
    }

    // 7. Invalidar caches
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation-messages:${conversationId}`)

    return { success: true }
  })

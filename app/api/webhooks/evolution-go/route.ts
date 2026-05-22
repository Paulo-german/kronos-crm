import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { SalesDistributionModel } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { isGroupMessage } from '@/_lib/evolution-js/parse-message'
import { parseEvolutionGoMessage } from '@/_lib/evolution-go/parse-message'
import { resolveConversation } from '@/_lib/whatsapp/resolve-conversation'
import { sendEvolutionGoMessage, sendEvolutionGoPresence } from '@/_lib/evolution-go/send-message'
import { checkBusinessHours } from '@/_lib/agent/check-business-hours'
import { scheduleNotifyOrgAdmins } from '@/_lib/notifications/notify-org-admins'
import { resolveAgentForConversation } from '@/../trigger/lib/resolve-agent'
import { tasks } from '@trigger.dev/sdk/v3'
import type { processAgentMessage } from '@/../../trigger/process-agent-message'
import type { NormalizedWhatsAppMessage } from '@/_lib/evolution-js/types'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'
import {
  resolveEvolutionGoCredentialsByInstanceName,
  resolveEvolutionGoWebhookSecretByInstanceName,
} from '@/_lib/evolution-go/resolve-credentials'
import {
  evolutionGoConnectionEventSchema,
  evolutionGoMessageEventSchema,
  evolutionGoStatusEventSchema,
} from '@/_lib/evolution-go/types'
import { updateDeliveryStatus, updateDeliveryStatusFailed } from '@/_lib/message-delivery-status'
import { AUTO_REOPEN_FIELDS } from '@/_lib/conversation/auto-reopen'
import { hasActivePlan } from '@/_lib/billing/has-active-plan'
import { broadcastAgentStatus } from '@/_lib/inbox/broadcast-agent-status'

const NOTIFICATION_ANTI_SPAM_WINDOW_MS = 24 * 60 * 60 * 1000
const DEDUP_TTL_SECONDS = 300
const OOH_REPLY_TTL_SECONDS = 3600

export async function POST(req: Request) {
  // 1. Validação de assinatura — Go é sempre per-inbox, não há secret global
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null

  if (!payload) {
    return NextResponse.json({ ignored: true, reason: 'invalid_payload' })
  }

  const instanceName = payload.instance as string | undefined
  if (!instanceName) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const inboxSecret = await resolveEvolutionGoWebhookSecretByInstanceName(instanceName)
  if (!inboxSecret || secret !== inboxSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event = payload.event as string | undefined

  // 2. CONNECTION — atualizar status no banco
  if (event === 'CONNECTION') {
    const parsed = evolutionGoConnectionEventSchema.safeParse(payload.data)
    if (!parsed.success) {
      return NextResponse.json({ ignored: true, reason: 'invalid_payload' })
    }

    const { state } = parsed.data
    if (state !== 'open' && state !== 'close') {
      return NextResponse.json({ ignored: true, reason: 'connection_state_ignored' })
    }

    const isConnected = state === 'open'

    const inbox = await db.inbox.findFirst({
      where: { evolutionInstanceName: instanceName, connectionType: 'EVOLUTION_GO' },
      select: { id: true, organizationId: true, agentId: true, evolutionConnected: true },
    })

    if (!inbox) {
      return NextResponse.json({ ignored: true, reason: 'no_inbox_found' })
    }

    if (inbox.evolutionConnected !== isConnected) {
      await db.inbox.update({
        where: { id: inbox.id },
        data: { evolutionConnected: isConnected },
      })

      revalidateTag(`inbox:${inbox.id}`)
      revalidateTag(`inboxes:${inbox.organizationId}`)
      if (inbox.agentId) {
        revalidateTag(`agent:${inbox.agentId}`)
        revalidateTag(`agents:${inbox.organizationId}`)
      }
    }

    if (!isConnected) {
      const recent = await db.notification.findFirst({
        where: {
          organizationId: inbox.organizationId,
          type: 'SYSTEM',
          title: 'Conexao WhatsApp perdida',
          readAt: null,
          createdAt: { gte: new Date(Date.now() - NOTIFICATION_ANTI_SPAM_WINDOW_MS) },
        },
      })

      if (!recent) {
        scheduleNotifyOrgAdmins({
          orgId: inbox.organizationId,
          type: 'SYSTEM',
          title: 'Conexao WhatsApp perdida',
          body: `A conexao WhatsApp "${instanceName}" foi perdida. Acesse as configuracoes para reconectar.`,
          actionPath: '/settings/inboxes',
          resourceType: 'inbox',
          resourceId: inbox.id,
        })
      }
    }

    return NextResponse.json({ success: true, state })
  }

  // 3. MESSAGE_STATUS — atualizar delivery status de mensagens enviadas
  if (event === 'MESSAGE_STATUS') {
    const parsed = evolutionGoStatusEventSchema.safeParse(payload.data)
    if (!parsed.success) {
      return NextResponse.json({ ignored: true, reason: 'invalid_payload' })
    }

    const outboundUpdates = parsed.data.filter((update) => update.key?.fromMe)

    for (const update of outboundUpdates) {
      const messageId = update.key.id
      const status = update.update?.status

      if (!messageId || !status) continue

      if (status === 'READ' || status === 'PLAYED') {
        const result = await updateDeliveryStatus(messageId, 'read')
        if (result) revalidateTag(`conversation-messages:${result.conversationId}`)
        continue
      }

      if (status === 'DELIVERY_ACK' || status === 'SERVER_ACK') {
        const result = await updateDeliveryStatus(messageId, 'delivered')
        if (result) revalidateTag(`conversation-messages:${result.conversationId}`)
        continue
      }

      if (status === 'ERROR') {
        const result = await updateDeliveryStatusFailed(messageId, {
          message: 'Falha na entrega ao protocolo WhatsApp.',
        })
        if (result) {
          revalidateTag(`conversation-messages:${result.conversationId}`)
          revalidateTag(`conversations:${result.organizationId}`)
        }
      }
    }

    return NextResponse.json({ success: true, processed: outboundUpdates.length })
  }

  // 4. Filtro de evento — só processar MESSAGE a partir daqui
  if (event !== 'MESSAGE') {
    return NextResponse.json({ ignored: true, reason: 'event_not_handled' })
  }

  const dataParsed = evolutionGoMessageEventSchema.safeParse(payload.data)
  if (!dataParsed.success) {
    return NextResponse.json({ ignored: true, reason: 'invalid_payload' })
  }
  const data = dataParsed.data

  const { key } = data
  const { fromMe, id: messageId } = key
  const remoteJid = key.remoteJidAlt && key.remoteJid.endsWith('@lid') ? key.remoteJidAlt : key.remoteJid

  if (isGroupMessage(remoteJid)) {
    return NextResponse.json({ ignored: true, reason: 'group_message' })
  }

  const inbox = await db.inbox.findFirst({
    where: {
      evolutionInstanceName: instanceName,
      connectionType: 'EVOLUTION_GO',
    },
    select: {
      id: true,
      isActive: true,
      organizationId: true,
      autoCreateDeal: true,
      pipelineId: true,
      distributionUserIds: true,
      squadId: true,
      agentId: true,
      agentGroupId: true,
      agent: {
        select: {
          id: true,
          name: true,
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
                  name: true,
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
  })

  if (!inbox) {
    return NextResponse.json({ ignored: true, reason: 'no_inbox_found' })
  }

  const orgId = inbox.organizationId

  const orgHasPlan = await hasActivePlan(orgId)
  if (!orgHasPlan) {
    return NextResponse.json({ ignored: true, reason: 'no_active_plan' })
  }

  const inboxCredentials = await resolveEvolutionGoCredentialsByInstanceName(instanceName)

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { salesDistributionModel: true },
  })
  const salesDistributionModel =
    org?.salesDistributionModel ?? SalesDistributionModel.ROUND_ROBIN

  const contactAssignContext = {
    distributionUserIds: inbox.distributionUserIds,
    inboxId: inbox.id,
    salesDistributionModel,
    squadId: inbox.squadId,
  }

  const dealContext = inbox.autoCreateDeal
    ? {
        pipelineId: inbox.pipelineId,
        distributionUserIds: inbox.distributionUserIds,
        inboxId: inbox.id,
        salesDistributionModel,
        squadId: inbox.squadId,
      }
    : undefined


  // 5. fromMe — checar dedup ANTES de qualquer DB call
  if (fromMe) {
    const dedupResult = await redis
      .set(`dedup:${messageId}`, '1', 'EX', DEDUP_TTL_SECONDS, 'NX')
      .catch(() => 'redis_error' as const)

    if (dedupResult === null) {
      return NextResponse.json({ ignored: true, reason: 'from_me_bot' })
    }

    const normalizedMsg = parseEvolutionGoMessage(data, instanceName)

    if (normalizedMsg.type === 'text' && !normalizedMsg.text) {
      return NextResponse.json({ ignored: true, reason: 'from_me_empty' })
    }

    const resolveResult = await resolveConversation(
      inbox.id,
      orgId,
      remoteJid,
      normalizedMsg.phoneNumber,
      normalizedMsg.pushName,
      dealContext,
      contactAssignContext,
      true,
    )

    if (resolveResult.isNew) {
      revalidateTag(`pipeline:${orgId}`)
      revalidateTag(`deals:${orgId}`)
      revalidateTag(`contacts:${orgId}`)
      revalidateTag(`dashboard:${orgId}`)
    }

    if (resolveResult.nameUpdated) {
      revalidateTag(`contacts:${orgId}`)
      revalidateTag(`deals:${orgId}`)
      revalidateTag(`pipeline:${orgId}`)
      revalidateTag(`conversations:${orgId}`)
    }

    await db.message.create({
      data: {
        conversationId: resolveResult.conversationId,
        role: 'assistant',
        content: resolveMessageContent(normalizedMsg),
        providerMessageId: messageId,
        metadata: {
          sentFrom: 'whatsapp_direct',
          ...(normalizedMsg.media ? { media: normalizedMsg.media } : {}),
        } as unknown as Prisma.InputJsonValue,
      },
    })

    await db.conversation.updateMany({
      where: { inboxId: inbox.id, remoteJid },
      data: {
        aiPaused: true,
        pausedAt: new Date(),
        lastMessageRole: 'assistant',
        ...AUTO_REOPEN_FIELDS,
      },
    })

    revalidateTag(`conversations:${orgId}`)
    revalidateTag(`conversation-messages:${resolveResult.conversationId}`)

    return NextResponse.json({ success: true, reason: 'from_me_saved' })
  }

  const hasAiConfigured = !!(inbox.agentId || inbox.agentGroupId)

  if (!inbox.isActive || !hasAiConfigured) {

    if (!inbox.isActive) {
      const recentDisconnectedNotification = await db.notification.findFirst({
        where: {
          organizationId: orgId,
          type: 'SYSTEM',
          title: 'WhatsApp desconectado',
          readAt: null,
          createdAt: { gte: new Date(Date.now() - NOTIFICATION_ANTI_SPAM_WINDOW_MS) },
        },
      })

      if (!recentDisconnectedNotification) {
        scheduleNotifyOrgAdmins({
          orgId,
          type: 'SYSTEM',
          title: 'WhatsApp desconectado',
          body: `A conexão WhatsApp "${instanceName}" está desativada. Mensagens não estão sendo processadas.`,
          actionPath: '/settings/inboxes',
          resourceType: 'inbox',
          resourceId: inbox.id,
        })
      }
    }

    const normalizedMsg = parseEvolutionGoMessage(data, instanceName)

    if (normalizedMsg.type === 'text' && !normalizedMsg.text) {
      return NextResponse.json({ ignored: true, reason: 'inactive_empty' })
    }

    const resolveResult = await resolveConversation(
      inbox.id,
      orgId,
      remoteJid,
      normalizedMsg.phoneNumber,
      normalizedMsg.pushName,
      dealContext,
      contactAssignContext,
      false,
    )

    if (resolveResult.isNew) {
      revalidateTag(`pipeline:${orgId}`)
      revalidateTag(`deals:${orgId}`)
      revalidateTag(`contacts:${orgId}`)
      revalidateTag(`dashboard:${orgId}`)
    }

    if (resolveResult.nameUpdated) {
      revalidateTag(`contacts:${orgId}`)
      revalidateTag(`deals:${orgId}`)
      revalidateTag(`pipeline:${orgId}`)
      revalidateTag(`conversations:${orgId}`)
    }

    const dedupResult = await redis
      .set(`dedup:${messageId}`, '1', 'EX', DEDUP_TTL_SECONDS, 'NX')
      .catch(() => 'redis_error' as const)

    if (dedupResult !== null) {
      await db.message.create({
        data: {
          conversationId: resolveResult.conversationId,
          role: 'user',
          content: resolveMessageContent(normalizedMsg) || '[mensagem não suportada]',
          providerMessageId: messageId,
          metadata: normalizedMsg.media
            ? ({ media: normalizedMsg.media } as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      })

      await db.conversation.update({
        where: { id: resolveResult.conversationId },
        data: {
          unreadCount: { increment: 1 },
          lastMessageRole: 'user',
          nextFollowUpAt: null,
          followUpCount: 0,
          lastCustomerMessageAt: new Date(),
          ...AUTO_REOPEN_FIELDS,
        },
      })

      revalidateTag(`conversations:${orgId}`)
      revalidateTag(`conversation-messages:${resolveResult.conversationId}`)
    }

    return NextResponse.json({ success: true, reason: 'agent_inactive_message_saved' })
  }

  const preResolveConv = inbox.agentGroupId
    ? await db.conversation.findFirst({
        where: { inboxId: inbox.id, remoteJid },
        select: { id: true, activeAgentId: true },
      })
    : null

  const resolvedAgent = await resolveAgentForConversation(inbox, preResolveConv)

  if (!resolvedAgent || !resolvedAgent.isActive) {
    const normalizedMsgInactive = parseEvolutionGoMessage(data, instanceName)
    if (normalizedMsgInactive.type === 'text' && !normalizedMsgInactive.text) {
      return NextResponse.json({ ignored: true, reason: 'inactive_empty' })
    }
    const resolveInactiveResult = await resolveConversation(
      inbox.id,
      orgId,
      remoteJid,
      normalizedMsgInactive.phoneNumber,
      normalizedMsgInactive.pushName,
      dealContext,
      contactAssignContext,
      false,
    )
    if (resolveInactiveResult.isNew) {
      revalidateTag(`pipeline:${orgId}`)
      revalidateTag(`deals:${orgId}`)
      revalidateTag(`contacts:${orgId}`)
      revalidateTag(`dashboard:${orgId}`)
    }
    if (resolveInactiveResult.nameUpdated) {
      revalidateTag(`contacts:${orgId}`)
      revalidateTag(`deals:${orgId}`)
      revalidateTag(`pipeline:${orgId}`)
      revalidateTag(`conversations:${orgId}`)
    }
    const dedupInactive = await redis
      .set(`dedup:${messageId}`, '1', 'EX', DEDUP_TTL_SECONDS, 'NX')
      .catch(() => 'redis_error' as const)
    if (dedupInactive !== null) {
      await db.message.create({
        data: {
          conversationId: resolveInactiveResult.conversationId,
          role: 'user',
          content: resolveMessageContent(normalizedMsgInactive) || '[mensagem não suportada]',
          providerMessageId: messageId,
          metadata: normalizedMsgInactive.media
            ? ({ media: normalizedMsgInactive.media } as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      })
      await db.conversation.update({
        where: { id: resolveInactiveResult.conversationId },
        data: {
          unreadCount: { increment: 1 },
          lastMessageRole: 'user',
          nextFollowUpAt: null,
          followUpCount: 0,
          lastCustomerMessageAt: new Date(),
          ...AUTO_REOPEN_FIELDS,
        },
      })
      revalidateTag(`conversations:${orgId}`)
      revalidateTag(`conversation-messages:${resolveInactiveResult.conversationId}`)
    }
    return NextResponse.json({ success: true, reason: 'agent_inactive_message_saved' })
  }


  // 7. Business hours check
  if (!resolvedAgent.requiresRouting && resolvedAgent.businessHoursEnabled && resolvedAgent.businessHoursConfig) {
    const isOpen = checkBusinessHours(
      resolvedAgent.businessHoursTimezone,
      resolvedAgent.businessHoursConfig as BusinessHoursConfig,
    )

    if (!isOpen) {

      const oohKey = `ooh-reply:${resolvedAgent.agentId}:${remoteJid}`
      const alreadyReplied = await redis
        .set(oohKey, '1', 'EX', OOH_REPLY_TTL_SECONDS, 'NX')
        .catch(() => null)

      const normalizedMsg = parseEvolutionGoMessage(data, instanceName)
      const resolveResult = await resolveConversation(
        inbox.id,
        orgId,
        remoteJid,
        normalizedMsg.phoneNumber,
        normalizedMsg.pushName,
        dealContext,
        contactAssignContext,
        false,
      )

      if (resolveResult.isNew) {
        revalidateTag(`pipeline:${orgId}`)
        revalidateTag(`deals:${orgId}`)
        revalidateTag(`contacts:${orgId}`)
        revalidateTag(`dashboard:${orgId}`)
      }

      if (resolveResult.nameUpdated) {
        revalidateTag(`contacts:${orgId}`)
        revalidateTag(`deals:${orgId}`)
        revalidateTag(`pipeline:${orgId}`)
        revalidateTag(`conversations:${orgId}`)
      }

      const dedupResult = await redis
        .set(`dedup:${messageId}`, '1', 'EX', DEDUP_TTL_SECONDS, 'NX')
        .catch(() => 'redis_error' as const)

      if (dedupResult !== null) {
        await db.message.create({
          data: {
            conversationId: resolveResult.conversationId,
            role: 'user',
            content: resolveMessageContent(normalizedMsg) || '[mensagem não suportada]',
            providerMessageId: messageId,
            metadata: normalizedMsg.media
              ? ({ media: normalizedMsg.media } as unknown as Prisma.InputJsonValue)
              : undefined,
          },
        })

        await db.conversation.update({
          where: { id: resolveResult.conversationId },
          data: {
            unreadCount: { increment: 1 },
            lastMessageRole: 'user',
            nextFollowUpAt: null,
            followUpCount: 0,
            ...AUTO_REOPEN_FIELDS,
          },
        })
      }

      const outOfHoursMessage = resolvedAgent.outOfHoursMessage
      const sentAutoReply = !!(outOfHoursMessage && alreadyReplied !== null)
      if (sentAutoReply && outOfHoursMessage) {
        try {
          const oohIds = await sendEvolutionGoMessage(
            instanceName,
            remoteJid,
            outOfHoursMessage,
            inboxCredentials,
          )
          await Promise.all(
            oohIds.map((sentId) =>
              redis.set(`dedup:${sentId}`, '1', 'EX', DEDUP_TTL_SECONDS).catch(() => {}),
            ),
          )
        } catch {
          // best-effort — falha no auto-reply não bloqueia o fluxo
        }
      }

      return NextResponse.json({ ignored: true, reason: 'outside_business_hours' })
    }

  }

  // 8. Normalize
  const normalizedMessage = parseEvolutionGoMessage(data, instanceName)

  if (normalizedMessage.type === 'text' && !normalizedMessage.text) {
    return NextResponse.json({ ignored: true, reason: 'empty_text' })
  }

  // 9. Dedup + Resolve Conversation em paralelo
  const [dedupResult, resolveResult] = await Promise.all([
    redis
      .set(`dedup:${messageId}`, '1', 'EX', DEDUP_TTL_SECONDS, 'NX')
      .catch(() => 'redis_error' as const),
    resolveConversation(
      inbox.id,
      orgId,
      remoteJid,
      normalizedMessage.phoneNumber,
      normalizedMessage.pushName,
      dealContext,
      contactAssignContext,
      false,
    ),
  ])

  if (dedupResult === null) {
    return NextResponse.json({ ignored: true, reason: 'duplicate' })
  }

  const { conversationId } = resolveResult

  if (resolveResult.isNew) {
    revalidateTag(`pipeline:${orgId}`)
    revalidateTag(`deals:${orgId}`)
    revalidateTag(`contacts:${orgId}`)
    revalidateTag(`dashboard:${orgId}`)
  }

  if (resolveResult.nameUpdated) {
    revalidateTag(`contacts:${orgId}`)
    revalidateTag(`deals:${orgId}`)
    revalidateTag(`pipeline:${orgId}`)
    revalidateTag(`conversations:${orgId}`)
  }

  // 10. Verificar se IA está pausada na conversa
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { aiPaused: true },
  })

  if (conversation?.aiPaused) {
    try {
      await db.message.create({
        data: {
          conversationId,
          role: 'user',
          content: resolveMessageContent(normalizedMessage),
          providerMessageId: messageId,
          metadata: normalizedMessage.media
            ? ({ media: normalizedMessage.media } as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      })

      await db.conversation.update({
        where: { id: conversationId },
        data: {
          unreadCount: { increment: 1 },
          lastMessageRole: 'user',
          nextFollowUpAt: null,
          followUpCount: 0,
          lastCustomerMessageAt: new Date(),
          ...AUTO_REOPEN_FIELDS,
        },
      })

      revalidateTag(`conversations:${orgId}`)
      revalidateTag(`conversation-messages:${conversationId}`)
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        return NextResponse.json({ success: true, reason: 'duplicate' })
      }
      throw error
    }

    return NextResponse.json({ success: true, reason: 'ai_paused_message_saved' })
  }

  // 11. Salvar mensagem
  try {
    await db.message.create({
      data: {
        conversationId,
        role: 'user',
        content: resolveMessageContent(normalizedMessage),
        providerMessageId: messageId,
        metadata: normalizedMessage.media
          ? ({ media: normalizedMessage.media } as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    })
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ success: true, reason: 'duplicate' })
    }
    throw error
  }

  // 12. Debounce + Dispatch + unreadCount
  const debounceTimestamp = Date.now()

  await Promise.all([
    db.conversation.update({
      where: { id: conversationId },
      data: {
        unreadCount: { increment: 1 },
        lastMessageRole: 'user',
        nextFollowUpAt: null,
        followUpCount: 0,
        lastCustomerMessageAt: new Date(),
        ...AUTO_REOPEN_FIELDS,
      },
    }),
    redis
      .set(
        `debounce:${conversationId}`,
        String(debounceTimestamp),
        'EX',
        resolvedAgent.debounceSeconds + 120,
      )
      .catch(() => {}),
    tasks.trigger<typeof processAgentMessage>(
      'process-agent-message',
      {
        message: normalizedMessage,
        agentId: resolvedAgent.agentId,
        conversationId,
        organizationId: orgId,
        debounceTimestamp,
        requiresRouting: resolvedAgent.requiresRouting,
        groupId: resolvedAgent.groupId,
      },
      { delay: `${resolvedAgent.debounceSeconds}s` },
    ),
    sendEvolutionGoPresence(instanceName, remoteJid, 'composing', inboxCredentials),
  ])

  if (resolvedAgent.debounceSeconds > 0) {
    void broadcastAgentStatus({
      conversationId,
      organizationId: orgId,
      state: 'waiting',
      agentName: resolvedAgent.agentName ?? undefined,
      updatedAt: new Date().toISOString(),
    })
  }

  revalidateTag(`conversations:${orgId}`)
  revalidateTag(`conversation-messages:${conversationId}`)

  return NextResponse.json({ success: true })
}

function resolveMessageContent(message: NormalizedWhatsAppMessage): string {
  switch (message.type) {
    case 'audio':
      return `[Áudio ${message.media?.seconds ?? 0}s]`
    case 'image': {
      const caption = message.text ? `: ${message.text}` : ''
      return `[Imagem${caption}]`
    }
    case 'document': {
      const fileName = message.media?.fileName ?? 'arquivo'
      return `[Documento: ${fileName}]`
    }
    default:
      return message.text ?? ''
  }
}
